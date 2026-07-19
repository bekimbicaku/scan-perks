import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, QrCode, CreditCard, Check, Settings, ChevronRight, Image as ImageIcon, ScanLine } from 'lucide-react-native';
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
import { colors, spacing } from '@/theme';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, getDb, getStorageInstance, deleteBusiness } from '@/lib/firebase';
import { router, useLocalSearchParams } from 'expo-router';

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
  const params = useLocalSearchParams<{ upgraded?: string }>();
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

  useEffect(() => {
    if (!mounted) return;
    void bootstrapBusinessScreen();
  }, [mounted, params.upgraded]);

  const bootstrapBusinessScreen = async () => {
    setBootstrapping(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        setBootstrapping(false);
        return;
      }

      const [businessDoc, userDoc] = await Promise.all([
        getDoc(doc(getDb(), 'businesses', userId)),
        getDoc(doc(getDb(), 'users', userId)),
      ]);

      const userData = userDoc.exists() ? userDoc.data() : null;
      const businessRaw = businessDoc.exists()
        ? (businessDoc.data() as Record<string, unknown>)
        : null;
      const draft = (userData?.businessDraft || null) as
        | (BusinessData & { plan?: Plan; logoUrl?: string })
        | null;
      const subscribed = Boolean(
        userData?.subscribed && userData?.planStatus === 'active'
      );
      const plan = (
        userData?.plan === 'premium' || draft?.plan === 'premium' ? 'premium' : 'basic'
      ) as Plan;

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
        return;
      }

      // Incomplete / missing business — continue onboarding (never wipe draft)
      setIsRegistered(false);
      setSelectedPlan(plan);
      setShowPayment(false);

      if (draft?.name) {
        setBusinessData({
          ...DEFAULT_BUSINESS_DATA,
          ...draft,
          plan,
          paymentId:
            userData?.stripeSubscriptionId ||
            userData?.stripeCheckoutSessionId ||
            undefined,
          planStatus: subscribed ? 'pending' : undefined,
        });
      }

      if (subscribed || params.upgraded === '1') {
        // Paid — skip back to form/payment; go to QR selection
        if (draft?.name) {
          setStep('qr-type');
        } else {
          // Paid but draft missing — ask for business info once, then QR
          setStep('register');
          setError(
            'Payment received. Please enter your business details to finish setup.'
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

    await setDoc(
      doc(getDb(), 'users', userId),
      {
        businessDraft: {
          name: data.name,
          type: data.type,
          email: data.email,
          phone: data.phone,
          address: data.address,
          logoUrl: data.logoUrl || null,
          plan: data.plan || selectedPlan,
        },
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
    <View style={styles.form}>
      <Text style={styles.formTitle}>Business Information</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Business Name *"
          value={businessData.name}
          onChangeText={(text) => setBusinessData(prev => ({ ...prev, name: text }))}
        />
      </View>

      <View style={styles.typeSelector}>
        <Text style={styles.typeLabel}>Business Type *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {BUSINESS_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                businessData.type === type && styles.typeButtonSelected
              ]}
              onPress={() => setBusinessData(prev => ({ ...prev, type }))}
            >
              <Text style={[
                styles.typeButtonText,
                businessData.type === type && styles.typeButtonTextSelected
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.logoUpload} onPress={pickImage}>
        {businessData.logoUrl ? (
          <Image
            source={{ uri: businessData.logoUrl }}
            style={styles.logoImage}
            contentFit="cover"
          />
        ) : (
          <>
            <ImageIcon size={24} color="#64748b" />
            <Text style={styles.logoUploadText}>Upload Logo (Optional)</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Contact Email *"
          value={businessData.email}
          onChangeText={(text) => setBusinessData(prev => ({ ...prev, email: text }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Phone Number *"
          value={businessData.phone}
          onChangeText={(text) => setBusinessData(prev => ({ ...prev, phone: text }))}
          keyboardType="phone-pad"
        />
      </View>

      <Text style={styles.sectionTitle}>Address Information</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Street Address *"
          value={businessData.address.street}
          onChangeText={(text) => setBusinessData(prev => ({
            ...prev,
            address: { ...prev.address, street: text }
          }))}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="City *"
          value={businessData.address.city}
          onChangeText={(text) => setBusinessData(prev => ({
            ...prev,
            address: { ...prev.address, city: text }
          }))}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Postal Code *"
          value={businessData.address.postalCode}
          onChangeText={(text) => setBusinessData(prev => ({
            ...prev,
            address: { ...prev.address, postalCode: text }
          }))}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleBusinessRegistration}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
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
      <Text style={styles.sectionTitle}>Choose Your Plan</Text>
      
      <View style={styles.planGrid}>
        {(Object.keys(PLANS) as Plan[]).map((plan) => (
          <TouchableOpacity
            key={plan}
            style={[styles.planCard, selectedPlan === plan && styles.planCardSelected]}
            onPress={() => setSelectedPlan(plan)}
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
                  <Check size={16} color={selectedPlan === plan ? '#0891b2' : '#64748b'} />
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
      <Text style={styles.sectionTitle}>Choose QR Code Type</Text>
      
      <View style={styles.qrOptions}>
        <TouchableOpacity 
          style={[styles.qrOption, qrType === 'static' && styles.qrOptionSelected]}
          onPress={() => setQrType('static')}
        >
          <QrCode size={32} color={qrType === 'static' ? '#0891b2' : '#64748b'} />
          <Text style={[styles.qrOptionTitle, qrType === 'static' && styles.qrOptionTitleSelected]}>
            Static QR
          </Text>
          <Text style={styles.qrOptionDescription}>
            Single QR code for all transactions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.qrOption, qrType === 'dynamic' && styles.qrOptionSelected]}
          onPress={() => setQrType('dynamic')}
        >
          <Building2 size={32} color={qrType === 'dynamic' ? '#0891b2' : '#64748b'} />
          <Text style={[styles.qrOptionTitle, qrType === 'dynamic' && styles.qrOptionTitleSelected]}>
            Dynamic QR
          </Text>
          <Text style={styles.qrOptionDescription}>
            Unique QR code for each transaction
          </Text>
        </TouchableOpacity>
      </View>

      <QRInstructions type={qrType} />

      <TouchableOpacity style={styles.button} onPress={handleQRTypeSelection}>
        <Text style={styles.buttonText}>Complete Registration</Text>
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
        ) : isRegistered ? renderDashboard() : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {step === 'register' && renderRegistrationForm()}
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
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
    marginTop: 24,
  },
  form: {
    padding: 20,
    gap: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  typeSelector: {
    marginBottom: 16,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
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
    backgroundColor: '#0891b2',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrOptions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  qrOption: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f8fafc',
  },
  qrOptionSelected: {
    borderColor: '#0891b2',
    backgroundColor: '#f0fdfa',
  },
  qrOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 4,
  },
  qrOptionTitleSelected: {
    color: '#0891b2',
  },
  qrOptionDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  planGrid: {
    gap: 16,
    marginBottom: 24,
  },
  planCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#f8fafc',
  },
  planCardSelected: {
    borderColor: '#0891b2',
    backgroundColor: '#f0fdfa',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  planNameSelected: {
    color: '#0891b2',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  planPriceSelected: {
    color: '#0891b2',
  },
  planPriceMonth: {
    fontSize: 16,
    color: '#64748b',
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
    color: '#64748b',
  },
  planFeatureTextSelected: {
    color: '#0f172a',
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
    color: '#0f172a',
    marginBottom: 12,
  },
  successDescription: {
    fontSize: 16,
    color: '#64748b',
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
  logoUpload: {
    height: 120,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoUploadText: {
    fontSize: 14,
    color: '#64748b',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
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