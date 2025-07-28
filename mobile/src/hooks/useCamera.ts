import { useState, useCallback } from 'react';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

interface CameraState {
  hasPermission: boolean | null;
  type: CameraType;
}

export function useCamera() {
  const [cameraState, setCameraState] = useState<CameraState>({
    hasPermission: null,
    type: 'back',
  });

  const requestCameraPermissions = useCallback(async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraState(prev => ({ ...prev, hasPermission: status === 'granted' }));
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow camera access to take mood photos.'
        );
      }
      
      return status === 'granted';
    } catch (error) {
      console.error('Camera permission request failed:', error);
      return false;
    }
  }, []);

  const requestGalleryPermissions = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access to select mood photos.'
        );
      }
      
      return status === 'granted';
    } catch (error) {
      console.error('Gallery permission request failed:', error);
      return false;
    }
  }, []);

  const takePicture = useCallback(async (cameraRef: any) => {
    try {
      if (!cameraRef) return null;

      const photo = await cameraRef.takePictureAsync({
        quality: 0.7,
        base64: false,
        exif: false,
      });

      return {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      };
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
      return null;
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    try {
      const hasPermission = await requestGalleryPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to pick from gallery:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
      return null;
    }
  }, [requestGalleryPermissions]);

  const flipCamera = useCallback(() => {
    setCameraState(prev => ({
      ...prev,
      type: prev.type === 'back' ? 'front' : 'back',
    }));
  }, []);

  const showImagePickerOptions = useCallback(() => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add a mood photo:',
      [
        {
          text: 'Camera',
          onPress: () => requestCameraPermissions(),
        },
        {
          text: 'Photo Library',
          onPress: () => pickFromGallery(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [requestCameraPermissions, pickFromGallery]);

  return {
    ...cameraState,
    requestCameraPermissions,
    requestGalleryPermissions,
    takePicture,
    pickFromGallery,
    flipCamera,
    showImagePickerOptions,
  };
}
