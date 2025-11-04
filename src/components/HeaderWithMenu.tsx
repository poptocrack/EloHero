import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress: () => void;
  isDestructive?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

interface HeaderWithMenuProps {
  title: string;
  onBackPress: () => void;
  menuItems?: MenuItem[];
}

export default function HeaderWithMenu({ title, onBackPress, menuItems }: HeaderWithMenuProps) {
  const { t } = useTranslation();
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const insets = useSafeAreaInsets();

  const handleMenuPress = (): void => {
    if (menuItems && menuItems.length > 0) {
      setShowMenuDropdown(true);
    }
  };

  const handleMenuItemPress = (item: MenuItem): void => {
    if (item.disabled || item.loading) return;
    setShowMenuDropdown(false);
    item.onPress();
  };

  const handleCloseMenu = (): void => {
    setShowMenuDropdown(false);
  };

  return (
    <>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        {menuItems && menuItems.length > 0 ? (
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Ionicons name="ellipsis-vertical" size={24} color="#2D3748" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {menuItems && menuItems.length > 0 && (
        <Modal
          transparent
          visible={showMenuDropdown}
          animationType="fade"
          onRequestClose={handleCloseMenu}
        >
          <TouchableWithoutFeedback onPress={handleCloseMenu}>
            <View style={[styles.overlay, { paddingTop: insets.top + 60 }]}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.dropdownContainer}>
                  {menuItems.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.menuItem,
                        (item.disabled || item.loading) && styles.menuItemDisabled
                      ]}
                      onPress={() => handleMenuItemPress(item)}
                      disabled={item.disabled || item.loading}
                    >
                      <View
                        style={[
                          styles.menuItemIconContainer,
                          item.isDestructive && styles.destructiveIconContainer
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={item.isDestructive ? '#c62828' : '#667eea'}
                        />
                      </View>
                      <Text
                        style={[styles.menuItemText, item.isDestructive && styles.destructiveText]}
                      >
                        {item.loading ? t('common.loading') : item.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FF'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
    marginHorizontal: 16
  },
  headerSpacer: {
    width: 40
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 20
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 56
  },
  menuItemDisabled: {
    opacity: 0.5
  },
  menuItemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  destructiveIconContainer: {
    backgroundColor: 'rgba(198, 40, 40, 0.1)'
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1,
    textAlignVertical: 'center',
    includeFontPadding: false,
    flexWrap: 'wrap'
  },
  destructiveText: {
    color: '#c62828'
  }
});
