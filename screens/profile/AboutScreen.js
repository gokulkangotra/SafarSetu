import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { SafarSetuIcon } from '../../components/SafarSetuLogo';

const InfoCard = ({ title, icon, iconColor, children }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.cardIconBox, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <View style={styles.divider} />
    {children}
  </View>
);

const FeatureItem = ({ icon, title, desc }) => (
  <View style={styles.featureRow}>
    <View style={styles.featureIconBox}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
    </View>
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  </View>
);

const TeamMember = ({ name, role, emoji }) => (
  <View style={styles.memberRow}>
    <View style={styles.memberAvatar}>
      <Text style={styles.memberEmoji}>{emoji}</Text>
    </View>
    <View>
      <Text style={styles.memberName}>{name}</Text>
      <Text style={styles.memberRole}>{role}</Text>
    </View>
  </View>
);

const TechItem = ({ icon, name, desc, lib }) => (
  <View style={styles.techRow}>
    <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
    <View style={{ flex: 1 }}>
      <Text style={styles.techName}>{name}</Text>
      <Text style={styles.techDesc}>{desc}</Text>
    </View>
    <View style={styles.techBadge}>
      <Text style={styles.techBadgeText}>{lib}</Text>
    </View>
  </View>
);

const AboutScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={COLORS.gradientPrimary} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About SafarSetu</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Logo & App Info */}
        <LinearGradient colors={COLORS.gradientPrimary} style={styles.heroBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <SafarSetuIcon size={72} />
          <Text style={styles.heroAppName}>SafarSetu</Text>
          <Text style={styles.heroTagline}>Smart Transport Tracker</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version 1.0.0  •  Major Project 2024</Text>
          </View>
        </LinearGradient>

        {/* About the Project */}
        <InfoCard title="About the Project" icon="information-circle" iconColor={COLORS.primary}>
          <Text style={styles.bodyText}>
            <Text style={styles.highlight}>SafarSetu</Text> (meaning "Bridge of Travel") is a comprehensive, 
            real-time public transport tracking and mobile ticketing application developed as part of our 
            final-year Major Project at <Text style={styles.highlight}>MIET Jammu</Text>.{'\n\n'}
            The platform is designed to solve the everyday challenges faced by commuters relying on public 
            buses and shared transport in semi-urban and urban areas. It bridges the gap between passengers 
            and transport operators using modern mobile technology and cloud-based infrastructure.{'\n\n'}
            SafarSetu gives passengers live visibility into bus locations, accurate estimated arrival times (ETA), 
            cashless mobile ticketing, and smart route discovery — all from a single app.
          </Text>
        </InfoCard>

        {/* Key Features */}
        <InfoCard title="Key Features" icon="star" iconColor="#f59e0b">
          <FeatureItem
            icon="map"
            title="Live Bus Tracking"
            desc="Track buses in real-time on an interactive map as they move along their routes."
          />
          <FeatureItem
            icon="time"
            title="Smart ETA Calculation"
            desc="Get accurate arrival time estimates at your nearest stop based on live bus position."
          />
          <FeatureItem
            icon="ticket"
            title="Mobile Ticketing"
            desc="Buy stop-to-stop tickets digitally with auto fare calculation based on distance."
          />
          <FeatureItem
            icon="notifications"
            title="Smart Notifications"
            desc="Get alerted when a bus on your saved routes starts its journey or nears your stop."
          />
          <FeatureItem
            icon="heart"
            title="Saved Routes"
            desc="Bookmark your frequent routes for quick access and personalised experience."
          />
          <FeatureItem
            icon="navigate"
            title="Route Explorer"
            desc="Browse all available routes with distance, duration, fare and vehicle count."
          />
        </InfoCard>

        {/* Technology Stack */}
        <InfoCard title="Technology Stack" icon="code-slash" iconColor={COLORS.success}>
          <TechItem icon="react" name="React Native + Expo" desc="Cross-platform mobile framework" lib="Frontend" />
          <TechItem icon="database" name="Supabase (PostgreSQL)" desc="Cloud database and authentication" lib="Backend" />
          <TechItem icon="map-marker-radius" name="OpenStreetMap + OSRM" desc="Road-snapped route mapping" lib="Maps" />
          <TechItem icon="bell-ring" name="Expo Notifications" desc="Local push notification engine" lib="Alerts" />
          <TechItem icon="navigation" name="Expo Location" desc="Real-time GPS for buses & users" lib="Location" />
        </InfoCard>

        {/* Our Team */}
        <InfoCard title="Meet the Team" icon="people" iconColor="#8b5cf6">
          <Text style={[styles.bodyText, { marginBottom: SPACING.md }]}>
            This application was designed, developed and tested by:
          </Text>
          <TeamMember name="Gokul Kangotra" role="Frontend & UI/UX Developer" emoji="👨‍💻" />
          <TeamMember name="Shivam Pandoh" role="Project Leader • GPS Module & App Expert" emoji="🏆" />
          <TeamMember name="Abhinandan Singh" role="Testing & Documentation" emoji="🧪" />
          <TeamMember name="Anshul Bhau" role="Backend Developer" emoji="⚙️" />
        </InfoCard>

        {/* Institution */}
        <InfoCard title="Institution" icon="school" iconColor="#ef4444">
          <View style={styles.institutionRow}>
            <Ionicons name="business" size={28} color={COLORS.primary} style={{ marginRight: SPACING.md }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.institutionName}>MIET Jammu</Text>
              <Text style={styles.institutionDetail}>Model Institute of Engineering & Technology</Text>
              <Text style={styles.institutionDetail}>Jammu & Kashmir, India</Text>
            </View>
          </View>
          <Text style={[styles.bodyText, { marginTop: SPACING.md }]}>
            Submitted to the Department of Computer Science & Engineering as part of the B.Tech Major Project 
            requirement under the academic year 2024–25.
          </Text>
        </InfoCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ in Jammu</Text>
          <Text style={styles.footerSub}>© 2024 SafarSetu. All rights reserved.</Text>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.base,
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  content: { padding: SPACING.base, gap: SPACING.md, paddingBottom: 40 },

  heroBanner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  heroAppName: { fontSize: 28, fontWeight: '800', color: COLORS.white, marginTop: SPACING.sm },
  heroTagline: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    marginTop: SPACING.md,
  },
  versionText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontWeight: '600' },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  cardIconBox: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.sm,
  },
  cardTitle: { fontSize: FONTS.sizes.base, fontWeight: '700', color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  bodyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 22 },
  highlight: { color: COLORS.primary, fontWeight: '700' },

  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.md },
  featureIconBox: {
    width: 34, height: 34, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.sm, marginTop: 2,
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  featureDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 18 },

  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md,
  },
  memberEmoji: { fontSize: 22 },
  memberName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  memberRole: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  techRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  techName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  techDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },
  techBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  techBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },

  institutionRow: { flexDirection: 'row', alignItems: 'center' },
  institutionName: { fontSize: FONTS.sizes.base, fontWeight: '700', color: COLORS.text },
  institutionDetail: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  footer: { alignItems: 'center', paddingVertical: SPACING.lg },
  footerText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text },
  footerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 4 },
});

export default AboutScreen;
