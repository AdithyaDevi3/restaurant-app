import React from "react";
import { View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../theme";

interface RatingStarsProps {
  rating: number;
  size?: number;
  color?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  size = 16,
  color = colors.accent,
}) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <MaterialIcons
          key={i}
          name="star"
          size={size}
          color={color}
          style={styles.star}
        />,
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <MaterialIcons
          key={i}
          name="star-half"
          size={size}
          color={color}
          style={styles.star}
        />,
      );
    } else {
      stars.push(
        <MaterialIcons
          key={i}
          name="star-outline"
          size={size}
          color={colors.border}
          style={styles.star}
        />,
      );
    }
  }

  return <View style={styles.container}>{stars}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  star: {
    marginRight: 2,
  },
});
