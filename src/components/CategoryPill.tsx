import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors, spacing, borderRadius, typography } from "../theme";

interface CategoryPillProps {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({
  label,
  onPress,
  selected = false,
  disabled = false,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.container,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel, textStyle]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  selected: {
    backgroundColor: colors.accent,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.bodySemibold,
    color: colors.textDark,
  },
  selectedLabel: {
    color: colors.text,
  },
});
