// SafarSetuLogo.js — View-based logo (no SVG, New Architecture compatible)

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Modal, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants/theme';

// Bus + pin icon using styled Views
export const SafarSetuIcon = ({ size = 48 }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  return (
    <>
      <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.8}>
        <Image 
          source={require('../assets/icon.png')} 
          style={{ width: size, height: size, borderRadius: size * 0.22 }} 
          resizeMode="cover"
        />
      </TouchableOpacity>
      
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackground}>
          <SafeAreaView style={styles.modalSafeArea}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
            
            <View style={styles.modalImageContainer}>
              <Image 
                source={require('../assets/icon.png')} 
                style={{ width: screenWidth * 0.85, height: screenWidth * 0.85, borderRadius: screenWidth * 0.85 * 0.22 }} 
                resizeMode="cover"
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

// Compact text logo for header
export const SafarSetuTextLogo = ({ size = 'md' }) => {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const textSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  return (
    <View style={styles.textLogoRow}>
      <SafarSetuIcon size={iconSize} />
      <View style={styles.textContainer}>
        <Text style={[styles.logoText, { fontSize: textSize, color: COLORS.white }]}>SafarSetu</Text>
        <Text style={styles.logoTagline}>Smart Transport Tracker</Text>
      </View>
    </View>
  );
};

// Full splash logo
export const SafarSetuSplashLogo = () => (
  <View style={styles.splashContainer}>
    <SafarSetuIcon size={120} />
    <Text style={styles.splashTitle}>SafarSetu</Text>
    <Text style={styles.splashTagline}>Smart Transport Tracking</Text>
  </View>
);

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingBottom: 4,
  },
  busBody: {
    alignItems: 'center',
  },
  busRoof: {
    width: 28,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    marginBottom: 1,
  },
  busWindows: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRadius: 2,
    marginBottom: 2,
  },
  window: {
    width: 6,
    height: 5,
    backgroundColor: '#1E3A8A',
    borderRadius: 1,
  },
  busBottom: {
    flexDirection: 'row',
    gap: 10,
  },
  wheel: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
  },
  pin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
    position: 'absolute',
    top: 4,
    right: 6,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  textLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textContainer: {
    justifyContent: 'center',
  },
  logoText: {
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  logoTagline: {
    fontSize: 10,
    color: COLORS.secondary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  splashContainer: {
    alignItems: 'center',
    gap: 16,
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
    marginTop: 8,
  },
  splashTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modalSafeArea: {
    flex: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 24,
    marginTop: 10,
  },
  closeText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '300',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
});

export default SafarSetuIcon;
