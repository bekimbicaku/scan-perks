import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { doc, collection, query, where, getDocs, addDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tag, Calendar, Send, ChevronRight, Users } from 'lucide-react-native';

interface Offer {
  id: string;
  title: string;
  description: string;
  validFrom: Date;
  validUntil: Date;
  terms: string;
  sentAt: Date;
  engagement: {
    views: number;
    claims: number;
  };
}

interface CustomerOffersManagementProps {
  businessId: string;
}

export default function CustomerOffersManagement({ businessId }: CustomerOffersManagementProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    validDays: '7',
    terms: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextAvailableDate, setNextAvailableDate] = useState<Date | null>(null);
  const [weeklyOffersCount, setWeeklyOffersCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadOffers();
    checkBusinessPlan();
  }, []);

  const checkBusinessPlan = async () => {
    try {
      const businessDoc = await getDoc(doc(db, 'businesses', businessId));
      if (businessDoc.exists()) {
        const data = businessDoc.data();
        setIsPremium(data.plan === 'premium');
      }
    } catch (err) {
      console.error('Error checking business plan:', err);
    }
  };

  const loadOffers = async () => {
    try {
      const offersRef = collection(db, 'businesses', businessId, 'offers');
      
      // Get all offers from the past week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const weeklyOffersQuery = query(
        offersRef,
        where('sentAt', '>', weekAgo)
      );
      
      const weeklyOffersSnapshot = await getDocs(weeklyOffersQuery);
      setWeeklyOffersCount(weeklyOffersSnapshot.docs.length);

      // Get active offers
      const activeOffersQuery = query(
        offersRef,
        where('validUntil', '>=', new Date())
      );
      
      const snapshot = await getDocs(activeOffersQuery);
      const loadedOffers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        validFrom: doc.data().validFrom.toDate(),
        validUntil: doc.data().validUntil.toDate(),
        sentAt: doc.data().sentAt.toDate(),
      })) as Offer[];

      setOffers(loadedOffers);

      // Calculate next available date if weekly limit is reached
      if (weeklyOffersSnapshot.docs.length > 0) {
        const latestOffer = weeklyOffersSnapshot.docs.reduce((latest, current) => 
          current.data().sentAt.toDate() > latest.data().sentAt.toDate() ? current : latest
        );
        
        const nextDate = new Date(latestOffer.data().sentAt.toDate());
        // If premium plan and less than 2 offers this week, allow another offer
        if (isPremium && weeklyOffersSnapshot.docs.length < 2) {
          setNextAvailableDate(null);
        } else {
          // Set next date to 7 days from first offer of the week
          nextDate.setDate(nextDate.getDate() + 7);
          setNextAvailableDate(nextDate);
        }
      } else {
        setNextAvailableDate(null);
      }
    } catch (err) {
      console.error('Error loading offers:', err);
      setError('Failed to load offers');
    }
  };

  const canSendNewOffer = () => {
    if (!nextAvailableDate) return true;
    
    // Premium users can send 2 offers per week
    if (isPremium && weeklyOffersCount < 2) return true;
    
    // Basic users can send 1 offer per week
    if (!isPremium && weeklyOffersCount < 1) return true;
    
    return new Date() >= nextAvailableDate;
  };

  const handleSendOffer = async () => {
    if (!canSendNewOffer()) {
      Alert.alert(
        'Cannot Send Offer',
        isPremium 
          ? 'Premium plan allows 2 offers per week. Next offer can be sent on ' + nextAvailableDate?.toLocaleDateString()
          : 'Basic plan allows 1 offer per week. Next offer can be sent on ' + nextAvailableDate?.toLocaleDateString()
      );
      return;
    }

    if (!newOffer.title || !newOffer.description || !newOffer.terms) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(newOffer.validDays));

      await addDoc(collection(db, 'businesses', businessId, 'offers'), {
        ...newOffer,
        validFrom: Timestamp.fromDate(validFrom),
        validUntil: Timestamp.fromDate(validUntil),
        sentAt: Timestamp.fromDate(new Date()),
        engagement: {
          views: 0,
          claims: 0,
        },
      });

      // Reset form
      setNewOffer({
        title: '',
        description: '',
        validDays: '7',
        terms: '',
      });

      // Reload offers to update counts and next available date
      await loadOffers();
      
      Alert.alert('Success', 'Offer has been sent to eligible customers');
    } catch (err) {
      console.error('Error sending offer:', err);
      setError('Failed to send offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Tag size={24} color="#0891b2" />
        <Text style={styles.title}>Customer Offers</Text>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create New Offer</Text>

          <View style={styles.offerLimitInfo}>
            <Calendar size={20} color="#0891b2" />
            <Text style={styles.offerLimitText}>
              {isPremium
                ? `Premium Plan: ${2 - weeklyOffersCount} offers remaining this week`
                : `Basic Plan: ${1 - weeklyOffersCount} offers remaining this week`}
            </Text>
          </View>

          {!canSendNewOffer() && (
            <View style={styles.warningBox}>
              <Calendar size={20} color="#f59e0b" />
              <Text style={styles.warningText}>
                Next offer can be sent on {nextAvailableDate?.toLocaleDateString()}
              </Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Offer Title *</Text>
              <TextInput
                style={styles.input}
                value={newOffer.title}
                onChangeText={(text) => setNewOffer(prev => ({ ...prev, title: text }))}
                placeholder="e.g., Weekend Special"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newOffer.description}
                onChangeText={(text) => setNewOffer(prev => ({ ...prev, description: text }))}
                placeholder="Describe your offer"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Valid for (days) *</Text>
              <TextInput
                style={styles.input}
                value={newOffer.validDays}
                onChangeText={(text) => setNewOffer(prev => ({ ...prev, validDays: text }))}
                keyboardType="number-pad"
                placeholder="7"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Terms & Conditions *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newOffer.terms}
                onChangeText={(text) => setNewOffer(prev => ({ ...prev, terms: text }))}
                placeholder="Enter terms and conditions"
                multiline
                numberOfLines={3}
              />
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Offers</Text>
          
          {offers.length === 0 ? (
            <Text style={styles.noOffersText}>No active offers</Text>
          ) : (
            <View style={styles.offersList}>
              {offers.map((offer) => (
                <View key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerHeader}>
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    <ChevronRight size={20} color="#64748b" />
                  </View>

                  <Text style={styles.offerDescription}>{offer.description}</Text>

                  <View style={styles.offerDates}>
                    <Text style={styles.offerDate}>
                      Valid: {offer.validFrom.toLocaleDateString()} - {offer.validUntil.toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.offerEngagement}>
                    <View style={styles.engagementMetric}>
                      <Users size={16} color="#64748b" />
                      <Text style={styles.engagementText}>
                        {offer.engagement.views} views
                      </Text>
                    </View>
                    <View style={styles.engagementMetric}>
                      <Tag size={16} color="#64748b" />
                      <Text style={styles.engagementText}>
                        {offer.engagement.claims} claims
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity 
        style={[
          styles.sendButton,
          (!canSendNewOffer() || loading) && styles.sendButtonDisabled
        ]} 
        onPress={handleSendOffer}
        disabled={!canSendNewOffer() || loading}
      >
        <Send size={20} color="#fff" />
        <Text style={styles.sendButtonText}>
          {loading ? 'Sending...' : 'Send Offer'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  offerLimitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  offerLimitText: {
    flex: 1,
    fontSize: 14,
    color: '#0891b2',
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  sendButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0891b2',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
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
    zIndex: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noOffersText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    padding: 20,
  },
  offersList: {
    gap: 16,
  },
  offerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  offerDescription: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
  },
  offerDates: {
    marginBottom: 12,
  },
  offerDate: {
    fontSize: 14,
    color: '#64748b',
  },
  offerEngagement: {
    flexDirection: 'row',
    gap: 16,
  },
  engagementMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    fontSize: 14,
    color: '#64748b',
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 90 : 76,
  },
});