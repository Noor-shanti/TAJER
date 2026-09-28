import React, { useRef, useState } from 'react';
import { InputAccessoryView, Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

let inputAccessoryCounter = 0;

export const Input: React.FC<InputProps> = ({ label, error, style, onBlur, onFocus, onSubmitEditing, returnKeyType, inputAccessoryViewID, ...props }) => {
  const [focused, setFocused] = useState(false);
  const accessoryId = useRef(inputAccessoryViewID || `merchant-input-accessory-${++inputAccessoryCounter}`).current;

  return (
    <>
      <View style={styles.container}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          style={[styles.input, focused && !error ? styles.inputFocused : null, error ? styles.inputError : null, style]}
          placeholderTextColor="#9AA6B8"
          textAlign="right"
          returnKeyType={returnKeyType || 'done'}
          blurOnSubmit
          inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : inputAccessoryViewID}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onSubmitEditing={(event) => {
            onSubmitEditing?.(event);
            Keyboard.dismiss();
          }}
          {...props}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={styles.keyboardBar}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="تم" onPress={Keyboard.dismiss} style={styles.doneButton}>
              <Text style={styles.doneText}>تم</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#29364A',
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F6F8FC',
    fontSize: 16,
    color: '#0B1220',
  },
  inputFocused: {
    backgroundColor: '#EAF2FF',
    borderColor: '#075FD8',
    borderWidth: 2,
  },
  keyboardBar: {
    height: 44,
    backgroundColor: '#F6F8FC',
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  doneButton: { paddingHorizontal: 10, paddingVertical: 6 },
  doneText: { color: '#075FD8', fontSize: 17, fontWeight: '800' },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF7F7',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    textAlign: 'right',
  },
});
