import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { C, R, UI } from '../shared/design';

interface BarcodeScannerProps {
  visible: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ visible, onScan, onClose }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      if (!permission?.granted) requestPermission().catch(() => {});
    }
  }, [visible, permission?.granted, requestPermission]);

  function handleScan({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    onScan(data);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: permission?.granted ? C.text : C.bg }}>
        <SafeAreaView style={{ backgroundColor: C.bgCard }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: UI.screenPad,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
              backgroundColor: C.bgCard,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: R.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.bgSection,
              }}
            >
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
            <Text
              style={{
                color: C.text,
                fontSize: 16,
                fontWeight: '800',
                marginLeft: 12,
              }}
            >
              Barcode уншуулах
            </Text>
          </View>
        </SafeAreaView>

        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleScan}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr',
                'ean13',
                'ean8',
                'code128',
                'code39',
                'upc_a',
                'upc_e',
              ],
            }}
          >
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 240,
                  height: 160,
                  borderWidth: 2,
                  borderColor: C.primary,
                  borderRadius: R.md,
                  backgroundColor: 'transparent',
                }}
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 20,
                  backgroundColor: C.text + 'B8',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: R.sm,
                }}
              >
                <Ionicons name="barcode-outline" size={16} color={C.bgCard} />
                <Text
                  style={{
                    color: C.bgCard,
                    fontSize: 13,
                    fontWeight: '700',
                    textAlign: 'center',
                  }}
                >
                  Барааны barcode-г хүрээнд байрлуул
                </Text>
              </View>
            </View>
          </CameraView>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: UI.screenPad,
              backgroundColor: C.bg,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: R.lg,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.primaryDim,
              }}
            >
              <Ionicons name="camera-outline" size={34} color={C.primary} />
            </View>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', textAlign: 'center' }}>
              Камерын эрх хэрэгтэй
            </Text>
            <Text style={{ color: C.textSub, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Barcode уншуулахын тулд камерын зөвшөөрөл өгнө үү.
            </Text>
            <TouchableOpacity
              onPress={() => requestPermission().catch(() => {})}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: C.primary,
                borderRadius: UI.controlRadius,
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}
            >
              <Ionicons name="camera" size={18} color={C.bgCard} />
              <Text style={{ color: C.bgCard, fontSize: 14, fontWeight: '800' }}>Эрх өгөх</Text>
            </TouchableOpacity>
          </View>
        )}

        {scanned && (
          <View
            style={{
              padding: UI.screenPad,
              backgroundColor: C.bgCard,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <TouchableOpacity
              onPress={() => setScanned(false)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: C.bgSection,
                borderRadius: UI.controlRadius,
                borderWidth: 1,
                borderColor: C.border,
                padding: 12,
              }}
            >
              <Ionicons name="scan-outline" size={18} color={C.primary} />
              <Text style={{ color: C.primary, fontSize: 13, fontWeight: '800' }}>Дахин уншуулах</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
