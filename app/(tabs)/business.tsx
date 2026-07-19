import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building2,
  QrCode,
  CreditCard,
  Check,
  Settings,
  ChevronRight,
  Image as ImageIcon,
  ScanLine,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import QRInstructions from '@/components/QRInstructions';
import BusinessAnalytics from '@/components/BusinessAnalytics';
import PayPalPaymentModal from '@/components/PayPalPaymentModal';
import DeleteBusinessModal from '@/components/DeleteBusinessModal';
import ViewQRCodeModal from '@/components/ViewQRCodeModal';
import ManageSubscriptionModal from '@/components/ManageSubscriptionModal';
import LoyaltyProgramSettings from '@/components/LoyaltyProgramSettings';
import CustomerSegmentation from '@/components/CustomerSegmentation';
import CustomerOffersManagement from '@/components/CustomerOffersManagement';
import BusinessGrowthHub from '@/components/BusinessGrowthHub';
import BusinessSettings from '@/components/BusinessSettings';
import BusinessDashboardHeader from '@/components/BusinessDashboardHeader';
import HappyHourBoost from '@/components/HappyHourBoost';
import ScanPulseInsights from '@/components/ScanPulseInsights';
import GlassBackground from '@/components/ui/GlassBackground';
import GlassInput from '@/components/ui/GlassInput';
import { colors, spacing, radius } from '@/theme';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, getAuthInstance, getDb, getStorageInstance, deleteBusiness, onAuthStateChanged } from '@/lib/firebase';
import { router, useLocalSearchParams } from 'expo-router';
import {
  clearLocalBusinessDraft,
  loadLocalBusinessDraft,
  saveLocalBusinessDraft,
  type BusinessDraft,
} from '@/lib/businessDraft';

type BusinessType = 'Bar' | 'Pizzeria' | 'Restaurant' | 'Cafe' | 'Other';
type Step = 'register' | 'payment' | 'qr-type' | 'success';
type QRType = 'static' | 'dynamic';
type Plan = 'basic' | 'premium';

interface BusinessData {
  name: string;
  type: BusinessType;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
}

const BUSINESS_TYPES: BusinessType[] = ['Bar', 'Pizzeria', 'Restaurant', 'Cafe', 'Other'];

const PLANS = {
  basic: {
    name: 'Starter',
    price: 10,
    features: [
      'Up to 500 scans per month',
      'Basic analytics',
      'Email support',
      'Single QR code'
    ],
  },
  premium: {
    name: 'Growth',
    price: 15,
    features: [
      'Unlimited scans',
      'Advanced analytics',
      'Priority support',
      'Multiple QR codes',
      'Custom branding',
      'API access'
    ],
  },
};

const DEFAULT_BUSINESS_DATA: BusinessData = {
  name: '',
  type: 'Restaurant',
  email: '',
  phone: '',
  address: {
    street: '',
    city: '',
    postalCode: '',
  },
};

function isCompleteBusiness(data: Record<string, unknown> | null | undefined): boolean {
  return Boolean(data?.name && data?.ownerId);
}

export default function BusinessScreen() {
  const params = useLocalSearchParams<{ upgraded?: string; step?: string }>();
  const [mounted, setMounted] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [step, setStep] = useState<Step>('register');
  const [qrType, setQrType] = useState<QRType>('static');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('basic');
  const [showPayment, setShowPayment] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessData & {
    planStartDate?: Date;
    qrType?: QRType;
    plan?: Plan;
    logoUrl?: string;
    paymentId?: string;
    planStatus?: string;
  }>(DEFAULT_BUSINESS_DATA);
  const [error, setError] = useState('');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'tools' | 'settings'>('overview');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Wait for Firebase Auth after Stripe redirect — otherwise we flash the empty form.
  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;
    let unsub: (() => void) | undefined;

    try {
      const authInstance = getAuthInstance();
      unsub = onAuthStateChanged(authInstance, (user) => {
        if (cancelled) return;
        if (!user) {
          setBootstrapping(false);
          return;
        }
        void bootstrapBusinessScreen(user.uid);
      });
    } catch (err) {
      console.warn('[business] auth bootstrap failed', err);
      setBootstrapping(false);
    }

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [mounted, params.upgraded, params.step]);

  const resolveDraft = (
    userId: string,
    firestoreDraft: BusinessDraft | null
  ): BusinessDraft | null => {
    if (firestoreDraft?.name) return firestoreDraft;
    return loadLocalBusinessDraft(userId);
  };

  const bootstrapBusinessScreen = async (userId: string) => {
    setBootstrapping(true);
    setError('');
    try {
      const [businessDoc, userDoc] = await Promise.all([
        getDoc(doc(getDb(), 'businesses', userId)),
        getDoc(doc(getDb(), 'users', userId)),
      ]);

      const userData = userDoc.exists() ? userDoc.data() : null;
      const businessRaw = businessDoc.exists()
        ? (businessDoc.data() as Record<string, unknown>)
        : null;
      const draft = resolveDraft(
        userId,
        (userData?.businessDraft as BusinessDraft | null) || null
      );
      const subscribed = Boolean(
        userData?.subscribed && userData?.planStatus === 'active'
      );
      const plan = (
        userData?.plan === 'premium' || draft?.plan === 'premium' ? 'premium' : 'basic'
      ) as Plan;
      const wantQrStep =
        params.step === 'qr-type' ||
        params.step === 'qr' ||
        userData?.onboardingStep === 'qr-type';

      // Fully registered business → dashboard
      if (isCompleteBusiness(businessRaw)) {
        setIsRegistered(true);
        setBusinessData({
          ...DEFAULT_BUSINESS_DATA,
          ...(businessRaw as BusinessData),
          plan: (businessRaw?.plan as Plan) || plan,
        });
        setSelectedPlan((businessRaw?.plan as Plan) || plan);
        setShowPayment(false);
        clearLocalBusinessDraft(userId);
        return;
      }

      setIsRegistered(false);
      setSelectedPlan(plan);
      setShowPayment(false);

      if (draft?.name) {
        setBusinessData({
          ...DEFAULT_BUSINESS_DATA,
          name: draft.name,
          type: (draft.type as BusinessType) || 'Restaurant',
          email: draft.email || auth.currentUser?.email || '',
          phone: draft.phone || '',
          address: {
            street: draft.address?.street || '',
            city: draft.address?.city || '',
            postalCode: draft.address?.postalCode || '',
          },
          logoUrl: draft.logoUrl || undefined,
          plan,
          paymentId:
            userData?.stripeSubscriptionId ||
            userData?.stripeCheckoutSessionId ||
            undefined,
          planStatus: subscribed ? 'pending' : undefined,
        });
      } else if (auth.currentUser?.email) {
        setBusinessData((prev) => ({
          ...prev,
          email: prev.email || auth.currentUser?.email || '',
          plan,
        }));
      }

      // Paid (or returning from Stripe) → go straight to QR when we have details
      if (subscribed || params.upgraded === '1' || wantQrStep) {
        if (draft?.name) {
          setStep('qr-type');
          setError('');
        } else {
          setStep('register');
          setError(
            'Payment received. Confirm your business details once to finish setup.'
          );
        }
        return;
      }

      if (draft?.name) {
        setStep('payment');
        return;
      }

      setStep('register');
    } catch (err) {
      console.error('Error bootstrapping business screen:', err);
      setError('Failed to load business data. Please try again later.');
    } finally {
      setBootstrapping(false);
    }
  };

  const saveBusinessDraft = async (
    data: BusinessData & { plan?: Plan; logoUrl?: string },
    onboardingStep: string
  ) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const draft: BusinessDraft = {
      name: data.name,
      type: data.type,
      email: data.email,
      phone: data.phone,
      address: data.address,
      logoUrl: data.logoUrl || null,
      plan: data.plan || selectedPlan,
    };

    // Survive Stripe full-page redirect even if Firestore write is slow/fails
    saveLocalBusinessDraft(userId, draft);

    await setDoc(
      doc(getDb(), 'users', userId),
      {
        businessDraft: draft,
        onboardingStep,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        return;
      }

      setStep('qr-type');
      setShowPayment(false);

      const next = {
        ...businessData,
        paymentId,
        plan: selectedPlan,
        planStatus: 'pending',
      };
      setBusinessData(next);
      await saveBusinessDraft(next, 'qr-type');
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
    }
  };

  const handleQRTypeSelection = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      if (!businessData.name || !businessData.email) {
        setError('Business details are missing. Please fill in your business information.');
        setStep('register');
        return;
      }

      await setDoc(
        doc(getDb(), 'businesses', userId),
        {
          name: businessData.name,
          type: businessData.type,
          email: businessData.email,
          phone: businessData.phone,
          address: businessData.address,
          logoUrl: businessData.logoUrl || null,
          qrType,
          plan: selectedPlan,
          planStatus: 'active',
          isActive: true,
          isPremium: selectedPlan === 'premium',
          planStartDate: new Date(),
          ownerId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      await setDoc(
        doc(getDb(), 'users', userId),
        {
          businessDraft: null,
          onboardingStep: 'complete',
          updatedAt: new Date(),
        },
        { merge: true }
      );

      clearLocalBusinessDraft(userId);

      setIsRegistered(true);
      setStep('success');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration');
    }
  };

  const handleDeleteBusiness = async () => {
    setDeleteLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        if (auth.currentUser) {
          router.replace('/login');
        }
        return;
      }

      await deleteBusiness(userId);
      setShowDeleteModal(false);
      setIsRegistered(false);
      setStep('register');
      setBusinessData(DEFAULT_BUSINESS_DATA);
    } catch (err: any) {
      setError(err.message || 'Failed to delete business');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBusinessRegistration = async () => {
    if (!businessData.name || !businessData.email || !businessData.phone || 
        !businessData.address.street || !businessData.address.city || !businessData.address.postalCode) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setError('');
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      // Persist draft before Stripe redirect wipes React state
      await saveBusinessDraft({ ...businessData, plan: selectedPlan }, 'payment');

      const userSnap = await getDoc(doc(getDb(), 'users', userId));
      const alreadyPaid =
        userSnap.exists() &&
        userSnap.data()?.subscribed === true &&
        userSnap.data()?.planStatus === 'active';

      if (alreadyPaid) {
        setStep('qr-type');
        return;
      }

      setStep('payment');
    } catch (err: any) {
      setError(err.message || 'Failed to register business');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Not authenticated');

        const logoRef = ref(getStorageInstance(), `business-logos/${userId}`);
        await uploadBytes(logoRef, blob);
        const logoUrl = await getDownloadURL(logoRef);

        setBusinessData(prev => ({ ...prev, logoUrl }));
      } catch (err: any) {
        setError('Failed to upload logo');
      }
    }
  };

  const renderRegistrationForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
      keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.onboardingScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.onboardingHeader}>
          <View style={styles.stepBadgeWrap}>
            <Text style={styles.stepBadge}>Step 1 of 3</Text>
          </View>
          <Text style={styles.formTitle}>Business details</Text>
          <Text style={styles.formSubtitle}>
            Tell customers who you are. You can edit this later in settings.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardLabel}>Basics</Text>
          <Text style={styles.fieldLabel}>Business name *</Text>
          <GlassInput
            icon={<Building2 size={18} color={colors.textMuted} />}
            placeholder="e.g. Blue Harbor Cafe"
            placeholderTextColor={colors.textMuted}
            value={businessData.name}
            onChangeText={(text) => setBusinessData((prev) => ({ ...prev, name: text }))}
            autoCapitalize="words"
            returnKeyType="next"
            style={styles.fieldInput}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Business type *</Text>
          <View style={styles.typeGrid}>
            {BUSINESS_TYPES.map((type) => {
              const selected = businessData.type === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, selected && styles.typeChipSelected]}
                  onPress={() => setBusinessData((prev) => ({ ...prev, type }))}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.logoUpload} onPress={pickImage} activeOpacity={0.85}>
            {businessData.logoUrl ? (
              <Image
                source={{ uri: businessData.logoUrl }}
                style={styles.logoImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.logoUploadInner}>
                <ImageIcon size={22} color={colors.primaryDark} />
                <Text style={styles.logoUploadText}>Add logo (optional)</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardLabel}>Contact</Text>
          <Text style={styles.fieldLabel}>Email *</Text>
          <GlassInput
            icon={<Mail size={18} color={colors.textMuted} />}
            placeholder="business@email.com"
            placeholderTextColor={colors.textMuted}
            value={businessData.email}
            onChangeText={(text) => setBusinessData((prev) => ({ ...prev, email: text }))}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            style={styles.fieldInput}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Phone *</Text>
          <GlassInput
            icon={<Phone size={18} color={colors.textMuted} />}
            placeholder="+355 ..."
            placeholderTextColor={colors.textMuted}
            value={businessData.phone}
            onChangeText={(text) => setBusinessData((prev) => ({ ...prev, phone: text }))}
            keyboardType="phone-pad"
            returnKeyType="next"
            style={styles.fieldInput}
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardLabel}>Address</Text>
          <Text style={styles.fieldLabel}>Street *</Text>
          <GlassInput
            icon={<MapPin size={18} color={colors.textMuted} />}
            placeholder="Street and number"
            placeholderTextColor={colors.textMuted}
            value={businessData.address.street}
            onChangeText={(text) =>
              setBusinessData((prev) => ({
                ...prev,
                address: { ...prev.address, street: text },
              }))
            }
            returnKeyType="next"
            style={styles.fieldInput}
          />

          <View style={styles.addressRow}>
            <View style={styles.addressCol}>
              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>City *</Text>
              <GlassInput
                placeholder="City"
                placeholderTextColor={colors.textMuted}
                value={businessData.address.city}
                onChangeText={(text) =>
                  setBusinessData((prev) => ({
                    ...prev,
                    address: { ...prev.address, city: text },
                  }))
                }
                returnKeyType="next"
                style={styles.fieldInput}
              />
            </View>
            <View style={styles.addressColNarrow}>
              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Postal *</Text>
              <GlassInput
                placeholder="Code"
                placeholderTextColor={colors.textMuted}
                value={businessData.address.postalCode}
                onChangeText={(text) =>
                  setBusinessData((prev) => ({
                    ...prev,
                    address: { ...prev.address, postalCode: text },
                  }))
                }
                returnKeyType="done"
                style={styles.fieldInput}
              />
            </View>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleBusinessRegistration}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Continue to plans</Text>
          <ChevronRight size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderDashboard = () => (
    <ScrollView style={styles.dashboard} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
      <BusinessDashboardHeader
        name={businessData.name || 'Your Business'}
        type={businessData.type}
        plan={businessData.plan}
        logoUrl={businessData.logoUrl}
        activeTab={dashboardTab}
        onTabChange={setDashboardTab}
        onOpenSettings={() => setDashboardTab('settings')}
      />

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionCard} onPress={() => setShowQRModal(true)}>
          <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}18` }]}>
            <QrCode size={22} color={colors.primaryDark} />
          </View>
          <Text style={styles.actionTitle}>QR Code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push(`/redeem?businessId=${auth.currentUser?.uid || ''}`)}
        >
          <View style={[styles.actionIcon, { backgroundColor: `${colors.success}18` }]}>
            <ScanLine size={22} color={colors.success} />
          </View>
          <Text style={styles.actionTitle}>Redeem</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => setShowSubscriptionModal(true)}>
          <View style={[styles.actionIcon, { backgroundColor: `${colors.accent}18` }]}>
            <CreditCard size={22} color={colors.accent} />
          </View>
          <Text style={styles.actionTitle}>Plan</Text>
        </TouchableOpacity>
      </View>

      {dashboardTab === 'overview' && (
        <>
          <ScanPulseInsights businessId={auth.currentUser?.uid || ''} />
          <BusinessAnalytics businessId={auth.currentUser?.uid || ''} />
          <CustomerSegmentation businessId={auth.currentUser?.uid || ''} />
          <BusinessGrowthHub businessId={auth.currentUser?.uid || ''} businessName={businessData.name || 'Your Business'} />
        </>
      )}

      {dashboardTab === 'tools' && (
        <>
          <HappyHourBoost businessId={auth.currentUser?.uid || ''} />
          <LoyaltyProgramSettings businessId={auth.currentUser?.uid || ''} />
          <CustomerOffersManagement businessId={auth.currentUser?.uid || ''} />
        </>
      )}

      {dashboardTab === 'settings' && (
        <>
          <BusinessSettings businessId={auth.currentUser?.uid || ''} />
          <TouchableOpacity style={styles.dangerLink} onPress={() => setShowDeleteModal(true)}>
            <Text style={styles.dangerText}>Delete business account</Text>
          </TouchableOpacity>
        </>
      )}

      <DeleteBusinessModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteBusiness}
        loading={deleteLoading}
        businessId={auth.currentUser?.uid || ''}
        initialSettings={businessData}
      />

      <ViewQRCodeModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        businessId={auth.currentUser?.uid || ''}
        qrType={businessData.qrType || 'static'}
      />

      <ManageSubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        currentPlan={businessData.plan === 'basic' ? 'Starter' : 'Growth'}
        planStartDate={businessData.planStartDate || new Date()}
      />
    </ScrollView>
  );

  const renderPlanSelection = () => (
    <View style={styles.section}>
      <View style={styles.stepBadgeWrap}>
        <Text style={styles.stepBadge}>Step 2 of 3</Text>
      </View>
      <Text style={styles.formTitle}>Choose your plan</Text>
      <Text style={styles.formSubtitle}>Pick what fits your venue. You can change later.</Text>
      
      <View style={styles.planGrid}>
        {(Object.keys(PLANS) as Plan[]).map((plan) => (
          <TouchableOpacity
            key={plan}
            style={[styles.planCard, selectedPlan === plan && styles.planCardSelected]}
            onPress={() => setSelectedPlan(plan)}
            activeOpacity={0.9}
          >
            <Text style={[styles.planName, selectedPlan === plan && styles.planNameSelected]}>
              {PLANS[plan].name}
            </Text>
            <Text style={[styles.planPrice, selectedPlan === plan && styles.planPriceSelected]}>
              ${PLANS[plan].price}
              <Text style={styles.planPriceMonth}>/mo</Text>
            </Text>
            <View style={styles.planFeatures}>
              {PLANS[plan].features.map((feature, index) => (
                <View key={index} style={styles.planFeature}>
                  <Check size={16} color={selectedPlan === plan ? colors.primaryDark : colors.textMuted} />
                  <Text style={[
                    styles.planFeatureText,
                    selectedPlan === plan && styles.planFeatureTextSelected
                  ]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={async () => {
          try {
            await saveBusinessDraft({ ...businessData, plan: selectedPlan }, 'awaiting_payment');
            setShowPayment(true);
          } catch (err: any) {
            setError(err.message || 'Failed to save business draft before payment');
          }
        }}
        activeOpacity={0.9}
      >
        <CreditCard size={20} color="#fff" />
        <Text style={styles.buttonText}>Proceed to Payment</Text>
      </TouchableOpacity>

      <PayPalPaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
        amount={PLANS[selectedPlan].price}
        plan={PLANS[selectedPlan].name}
      />
    </View>
  );

  const renderQRTypeSelection = () => (
    <View style={styles.section}>
      <View style={styles.stepBadgeWrap}>
        <Text style={styles.stepBadge}>Step 3 of 3</Text>
      </View>
      <Text style={styles.formTitle}>Choose QR type</Text>
      <Text style={styles.formSubtitle}>Static is simplest for most venues. Dynamic for unique codes per visit.</Text>
      
      <View style={styles.qrOptions}>
        <TouchableOpacity 
          style={[styles.qrOption, qrType === 'static' && styles.qrOptionSelected]}
          onPress={() => setQrType('static')}
          activeOpacity={0.9}
        >
          <QrCode size={32} color={qrType === 'static' ? colors.primaryDark : colors.textMuted} />
          <Text style={[styles.qrOptionTitle, qrType === 'static' && styles.qrOptionTitleSelected]}>
            Static QR
          </Text>
          <Text style={styles.qrOptionDescription}>
            One code for all customers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.qrOption, qrType === 'dynamic' && styles.qrOptionSelected]}
          onPress={() => setQrType('dynamic')}
          activeOpacity={0.9}
        >
          <Building2 size={32} color={qrType === 'dynamic' ? colors.primaryDark : colors.textMuted} />
          <Text style={[styles.qrOptionTitle, qrType === 'dynamic' && styles.qrOptionTitleSelected]}>
            Dynamic QR
          </Text>
          <Text style={styles.qrOptionDescription}>
            Unique code per visit
          </Text>
        </TouchableOpacity>
      </View>

      <QRInstructions type={qrType} />

      <TouchableOpacity style={styles.button} onPress={handleQRTypeSelection} activeOpacity={0.9}>
        <Text style={styles.buttonText}>Complete setup</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Check size={48} color="#0891b2" />
      </View>
      <Text style={styles.successTitle}>Registration Complete!</Text>
      <Text style={styles.successDescription}>
        Your business profile has been created successfully. You can now start managing your loyalty program.
      </Text>
      
      <QRInstructions type={qrType} />
    </View>
  );

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {bootstrapping ? (
          <View style={styles.successContainer}>
            <Text style={styles.successDescription}>Loading your business setup...</Text>
          </View>
        ) : isRegistered ? (
          renderDashboard()
        ) : step === 'register' ? (
          renderRegistrationForm()
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.onboardingScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'payment' && renderPlanSelection()}
            {step === 'qr-type' && renderQRTypeSelection()}
            {step === 'success' && renderSuccess()}
          </ScrollView>
        )}
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  onboardingScroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  onboardingHeader: {
    marginBottom: spacing.sm,
  },
  stepBadgeWrap: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primaryDark}14`,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: spacing.sm,
  },
  stepBadge: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 16,
    marginTop: 24,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: colors.glass.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },
  fieldLabelSpaced: {
    marginTop: spacing.sm,
  },
  fieldInput: {
    color: colors.navy,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typeChipTextSelected: {
    color: colors.white,
  },
  logoUpload: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.offWhite,
    overflow: 'hidden',
  },
  logoUploadInner: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.md,
  },
  logoUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  logoImage: {
    width: '100%',
    height: 120,
  },
  addressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addressCol: {
    flex: 1.4,
  },
  addressColNarrow: {
    flex: 1,
  },
  form: {
    padding: 20,
    gap: 16,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: colors.navy,
  },
  typeSelector: {
    marginBottom: 16,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  typeButtonSelected: {
    backgroundColor: colors.primaryDark,
  },
  typeButtonText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
    minHeight: 54,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  qrOptions: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 12,
    marginBottom: 8,
  },
  qrOption: {
    flex: 1,
    padding: 18,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  qrOptionSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: '#F0F9FF',
  },
  qrOptionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy,
    marginTop: 12,
    marginBottom: 4,
  },
  qrOptionTitleSelected: {
    color: colors.primaryDark,
  },
  qrOptionDescription: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  planGrid: {
    gap: 12,
    marginBottom: 8,
  },
  planCard: {
    padding: 20,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
  },
  planCardSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: '#F0F9FF',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 8,
  },
  planNameSelected: {
    color: colors.primaryDark,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 16,
  },
  planPriceSelected: {
    color: colors.primaryDark,
  },
  planPriceMonth: {
    fontSize: 16,
    color: colors.textMuted,
  },
  planFeatures: {
    gap: 12,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },
  planFeatureTextSelected: {
    color: colors.navy,
  },
  successContainer: {
    padding: 20,
    alignItems: 'center',
  },
  successIcon: {
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 50,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 12,
  },
  successDescription: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  dashboard: {
    flex: 1,
    backgroundColor: '#fff',
  },
  businessHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  businessLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessDetails: {
    flex: 1,
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  businessType: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    zIndex: 10,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.glass.backgroundStrong,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 8,
  },
  sendButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0891b2',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    paddingBottom: 16,
  },
  dangerLink: { alignItems: 'center', padding: spacing.lg },
  dangerText: { color: colors.error, fontWeight: '600' },
});