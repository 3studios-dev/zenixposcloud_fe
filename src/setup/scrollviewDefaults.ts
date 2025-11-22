// src/setup/scrollviewDefaults.ts
import { ScrollView as RNScrollView } from "react-native";

const ScrollView: any = RNScrollView; // 👈 cast a any

if (!ScrollView.defaultProps) {
    ScrollView.defaultProps = {};
}

ScrollView.defaultProps.showsVerticalScrollIndicator = false;
ScrollView.defaultProps.showsHorizontalScrollIndicator = false;
