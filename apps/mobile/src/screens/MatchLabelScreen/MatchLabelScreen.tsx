import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MatchLabel } from '@elohero/shared-types';
import { useGroupStore } from '../../store/groupStore';
import { useMatchLabels, useCreateMatchLabel } from '../../hooks/useMatchLabels';

interface MatchLabelScreenProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
      selectedLabelId: string | null;
    };
  };
}

export default function MatchLabelScreen({ navigation, route }: MatchLabelScreenProps) {
  const { groupId, selectedLabelId: initialSelectedLabelId } = route.params;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setMatchLabel } = useGroupStore();

  const [newLabelName, setNewLabelName] = useState('');
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(initialSelectedLabelId);

  // Use React Query to fetch labels (cached)
  const {
    data: labels = [],
    isLoading: isLoadingLabels,
    error: labelsError
  } = useMatchLabels(groupId);

  // Mutation for creating labels
  const createLabelMutation = useCreateMatchLabel();

  // Show error if premium/permission issue
  useEffect(() => {
    if (labelsError) {
      const errorMessage =
        labelsError instanceof Error ? labelsError.message : String(labelsError);
      if (errorMessage.includes('premium') || errorMessage.includes('permission')) {
        Alert.alert(t('common.error'), errorMessage);
      }
    }
  }, [labelsError, t]);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      Alert.alert(t('common.error'), t('matchLabelScreen.nameRequired'));
      return;
    }

    if (newLabelName.trim().length > 50) {
      Alert.alert(t('common.error'), t('matchLabelScreen.nameTooLong'));
      return;
    }

    const labelName = newLabelName.trim();
    setNewLabelName('');

    // Use mutation to create label (optimistic updates handled in hook)
    createLabelMutation.mutate(
      { groupId, name: labelName },
      {
        onSuccess: (data) => {
          // Select the newly created label
          setSelectedLabelId(data.id);
        },
        onError: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : t('matchLabelScreen.createError');
          Alert.alert(t('common.error'), errorMessage);
        }
      }
    );
  };

  const handleSelectLabel = (labelId: string) => {
    setSelectedLabelId(labelId);
  };

  const handleUseLabel = () => {
    if (selectedLabelId) {
      // Optimistic update: update store immediately
      setMatchLabel(selectedLabelId);
      navigation.goBack();
    }
  };

  const handleClearLabel = () => {
    // Optimistic update: clear label immediately
    setMatchLabel(null);
    navigation.goBack();
  };

  const selectedLabel = labels.find((l) => l.id === selectedLabelId);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('matchLabelScreen.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Add New Label Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('matchLabelScreen.addNew')}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('matchLabelScreen.namePlaceholder')}
              placeholderTextColor="#A0AEC0"
              value={newLabelName}
              onChangeText={setNewLabelName}
              maxLength={50}
            />
            <TouchableOpacity style={styles.createButton} onPress={handleCreateLabel}>
              <Text style={styles.createButtonText}>{t('matchLabelScreen.create')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Select Existing Label Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('matchLabelScreen.selectExisting')}</Text>
          {labels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={48} color="#A0AEC0" />
              <Text style={styles.emptyText}>{t('matchLabelScreen.noLabels')}</Text>
              <Text style={styles.emptySubtext}>{t('matchLabelScreen.noLabelsSubtext')}</Text>
            </View>
          ) : (
            <View style={styles.labelsList}>
              {labels.map((label) => {
                const isSelected = label.id === selectedLabelId;
                return (
                  <TouchableOpacity
                    key={label.id}
                    style={[styles.labelCard, isSelected && styles.labelCardSelected]}
                    onPress={() => handleSelectLabel(label.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.labelContent}>
                      <View style={styles.labelIconContainer}>
                        <Ionicons
                          name="pricetag"
                          size={20}
                          color={isSelected ? '#fff' : '#667eea'}
                        />
                      </View>
                      <Text
                        style={[styles.labelName, isSelected && styles.labelNameSelected]}
                        numberOfLines={1}
                      >
                        {label.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {selectedLabel ? (
          <>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearLabel}>
              <Text style={styles.clearButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.useButton} onPress={handleUseLabel}>
              <Text style={styles.useButtonText}>
                {t('matchLabelScreen.use')} "{selectedLabel.name}"
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.useButton} onPress={() => navigation.goBack()}>
            <Text style={styles.useButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748'
  },
  headerSpacer: {
    width: 40
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    gap: 24
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8
  },
  inputContainer: {
    gap: 12
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D3748',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  createButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748'
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#718096',
    textAlign: 'center'
  },
  labelsList: {
    gap: 12
  },
  labelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E2E8F0'
  },
  labelCardSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea'
  },
  labelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  labelIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  labelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1
  },
  labelNameSelected: {
    color: '#fff'
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    gap: 12
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568'
  },
  useButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  useButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});

