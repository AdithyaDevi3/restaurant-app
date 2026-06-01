import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";
import { colors, spacing, borderRadius, shadows } from "../theme";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = 100,
  borderRadius: radius = borderRadius.md,
  style,
}) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmerValue]);

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  return (
    <Animated.View
      style={[
        styles.loader,
        {
          width: width as any,
          height,
          borderRadius: radius,
          opacity,
        },
        style,
      ]}
    />
  );
};

interface SkeletonCardProps {
  style?: ViewStyle;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLoader
        height={150}
        borderRadius={borderRadius.lg}
        style={styles.image}
      />
      <View style={styles.content}>
        <SkeletonLoader height={16} width="70%" style={styles.title} />
        <SkeletonLoader height={12} width="50%" style={styles.subtitle} />
        <View style={styles.row}>
          <SkeletonLoader height={12} width="30%" />
          <SkeletonLoader height={12} width="30%" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loader: {
    backgroundColor: colors.skeletonGray,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...shadows.md,
  },
  image: {
    width: "100%",
    height: 150,
  },
  content: {
    padding: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
