import { ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Form screen shell: the keyboard never covers the fields/button (avoiding view + scroll),
 * taps on empty space dismiss it, and taps on buttons still work (handled).
 */
export default function ScreenFormContainer({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <Pressable accessible={false} onPress={Keyboard.dismiss} style={{ flexGrow: 1, justifyContent: 'center' }}>
            {children}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
