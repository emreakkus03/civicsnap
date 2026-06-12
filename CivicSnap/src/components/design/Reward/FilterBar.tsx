import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";

const LOCATION_LABELS: Record<string, string> = {
  all: "Alle",
  antwerp: "Antwerpen",
  ghent: "Gent",
  brussels: "Brussel",
  bruges: "Brugge",
  hasselt: "Hasselt",
  courtrai: "Kortrijk",
  namur: "Namen",
  liege: "Luik",
  charleroi: "Charleroi",
};

interface FilterBarProps {
  selectedFilter: string;
  selectedLocation: string;
  showLocationDropdown: boolean;
  filters: { key: string; label: string }[];
  locations: { key: string; label: string }[];
  onFilterChange: (key: string) => void;
  onLocationChange: (key: string) => void;
  onDropdownToggle: () => void;
}

export default function FilterBar({
  selectedFilter,
  selectedLocation,
  showLocationDropdown,
  filters,
  locations,
  onFilterChange,
  onLocationChange,
  onDropdownToggle,
}: FilterBarProps) {
    const colors = useThemeColors();                                       
    const styles = createStyles(colors);
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filtersScroll}
      >
        {/* --- 1. ALLES KNOP --- */}
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === "all" && selectedLocation === "all" && styles.filterChipActive,
          ]}
          onPress={() => { onFilterChange("all"); onLocationChange("all"); }}
        >
          <Text style={[styles.filterChipText, selectedFilter === "all" && selectedLocation === "all" && styles.filterChipTextActive]}>
            Alles
          </Text>
        </TouchableOpacity>

        {/* --- 2. LOKAAL KNOP (NIEUW) --- */}
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedLocation === "local" && styles.filterChipActive,
          ]}
          onPress={() => { onFilterChange("all"); onLocationChange("local"); }}
        >
          <Text style={[styles.filterChipText, selectedLocation === "local" && styles.filterChipTextActive]}>
            Lokaal
          </Text>
        </TouchableOpacity>

        {/* --- 3. STEDEN DROPDOWN --- */}
        <TouchableOpacity
          style={[styles.filterChip, styles.locationChip, selectedLocation !== "all" && selectedLocation !== "local" && styles.filterChipActive]}
          onPress={onDropdownToggle}
        >
          <Text style={[styles.filterChipText, selectedLocation !== "all" && selectedLocation !== "local" && styles.filterChipTextActive]}>
            {selectedLocation === "all" || selectedLocation === "local" ? "Andere stad" : LOCATION_LABELS[selectedLocation]}
          </Text>
          <Ionicons
            name={showLocationDropdown ? "chevron-up" : "chevron-down"}
            size={12}
            color={selectedLocation !== "all" && selectedLocation !== "local" ? colors.textInverse : colors.textLight}
          />
        </TouchableOpacity>

        {/* --- 4. TYPE FILTERS (Korting, Gratis, etc.) --- */}
        {filters.filter((f) => f.key !== "all").map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[styles.filterChip, selectedFilter === filter.key && styles.filterChipActive]}
            onPress={() => onFilterChange(filter.key)}
          >
            <Text style={[styles.filterChipText, selectedFilter === filter.key && styles.filterChipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* --- DROPDOWN MENU --- */}
      {showLocationDropdown && (
        <View style={styles.locationDropdown}>
          {locations.filter(loc => loc.key !== "all").map((loc) => (
            <TouchableOpacity
              key={loc.key}
              style={[styles.locationDropdownItem, selectedLocation === loc.key && styles.locationDropdownItemActive]}
              onPress={() => {
                onLocationChange(loc.key);
                onDropdownToggle(); // Sluit de dropdown na het klikken
              }}
            >
              <Text style={[styles.locationDropdownText, selectedLocation === loc.key && styles.locationDropdownTextActive]}>
                {loc.label}
              </Text>
              {selectedLocation === loc.key && (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  filtersScroll: {
    marginBottom: Variables.sizes.sm,
  },
  filtersContent: {
    paddingHorizontal: Variables.sizes.md,
    gap: Variables.sizes.sm,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: Variables.sizes.md,
    paddingVertical: Variables.sizes.xs,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.sm,
    color: colors.textLight,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Variables.sizes.xs,
  },
  locationDropdown: {
    marginHorizontal: Variables.sizes.md,
    marginBottom: Variables.sizes.sm,
    backgroundColor: colors.surface,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  locationDropdownItem: {
    paddingHorizontal: Variables.sizes.md,
    paddingVertical: Variables.sizes.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationDropdownItemActive: {
    backgroundColor: colors.primary + "15",
  },
  locationDropdownText: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.base,
    color: colors.text,
  },
  locationDropdownTextActive: {
    fontFamily: Variables.fonts.bold,
    color: colors.primary,
  },
});