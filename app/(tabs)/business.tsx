import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, QrCode, CreditCard, Check, Settings, ChevronRight, Image as ImageIcon } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import QRInstructions from '@/components/QRInstructions';
import BusinessAnalytics from '@/components/BusinessAnalytics';
import PayPalPaymentModal from '@/components/PayPalPaymentModal';
import DeleteBusinessModal from '@/components/DeleteBusinessModal';
import ViewQRCodeModal from '@/components/ViewQRCodeModal';
import ManageSubscriptionModal from '@/components/ManageSubscriptionModal';
import LoyaltyProgramSettings from '@/components/LoyaltyProgramSettings';
import CustomerOffersManagement from '@/components/CustomerOffersManagement';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, deleteBusiness } from '@/lib/firebase';
import { router } from 'expo-router';

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
    name: 'Basic Plan',
    price: 10,
    features: [
      'Up to 500 scans per month',
      'Basic analytics',
      'Email support',
      'Single QR code'
    ],
  },
  premium: {
    name: 'Premium Plan',
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

export default function BusinessScreen() {
  const [mounted, setMounted] = useState(false);
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
  }>(DEFAULT_BUSINESS_DATA);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      checkBusinessRegistration();
    }
  }, [mounted]);

  const checkBusinessRegistration = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        if (auth.currentUser) {
          router.replace('/(auth)/login');
        }
        return;
      }

      const businessDoc = await getDoc(doc(db, 'businesses', userId));
      if (businessDoc.exists()) {
        setIsRegistered(true);
        setBusinessData({
          ...DEFAULT_BUSINESS_DATA,
          ...businessDoc.data() as BusinessData,
        });
      } else {
        setIsRegistered(false);
        setStep('register');
        setBusinessData(DEFAULT_BUSINESS_DATA);
      }
    } catch (error: any) {
      console.error('Error checking business registration:', error);
      setError('Failed to load business data. Please try again later.');
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        if (auth.currentUser) {
          router.replace('/(auth)/login');
        }
        return;
      }

      // After successful payment, move to QR type selection
      setStep('qr-type');
      setShowPayment(false);
      
      // Store temporary payment data
      setBusinessData(prev => ({
        ...prev,
        paymentId,
        plan: selectedPlan,
        planStatus: 'pending', // Will be updated to 'active' after QR type is selected
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
    }
  };

  const handleQRTypeSelection = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      // Now create the business with all data including QR type
      await setDoc(doc(db, 'businesses', userId), {
        ...businessData,
        qrType,
        planStatus: 'active',
        planStartDate: new Date(),
        ownerId: userId,
        createdAt: new Date(),
      });

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
          router.replace('/(auth)/login');
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

        const logoRef = ref(storage, `business-logos/${userId}`);
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
    <ScrollView style={styles.dashboard} showsVerticalScrollIndicator={false}>
      <View style={styles.businessHeader}>
        <View style={styles.businessInfo}>
          <View style={styles.businessLogoPlaceholder}>
            <Building2 size={32} color="#64748b" />
          </View>
          <View style={styles.businessDetails}>
            <Text style={styles.businessName}>{businessData.name}</Text>
            <Text style={styles.businessType}>{businessData.type}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => setShowDeleteModal(true)}
        >
          <Settings size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setShowQRModal(true)}
        >
          <View style={styles.actionIcon}>
            <QrCode size={24} color="#0891b2" />
          </View>
          <Text style={styles.actionTitle}>View QR Code</Text>
          <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setShowSubscriptionModal(true)}
        >
          <View style={styles.actionIcon}>
            <CreditCard size={24} color="#0891b2" />
          </View>
          <Text style={styles.actionTitle}>Manage Subscription</Text>
          <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <BusinessAnalytics businessId={auth.currentUser?.uid || ''} />

      <LoyaltyProgramSettings businessId={auth.currentUser?.uid || ''} />

      <CustomerOffersManagement businessId={auth.currentUser?.uid || ''} />

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
        currentPlan={businessData.plan === 'basic' ? 'Basic Plan' : 'Premium Plan'}
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
        onPress={() => setShowPayment(true)}
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
    <SafeAreaView style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {isRegistered ? (
        renderDashboard()
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {step === 'register' && renderRegistrationForm()}
          {step === 'payment' && renderPlanSelection()}
          {step === 'qr-type' && renderQRTypeSelection()}
          {step === 'success' && renderSuccess()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    padding: 20,
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
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
    paddingBottom: 80, // Add space for fixed button
  },
});