import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Rect,
  Circle,
  G,
  Font,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { ReportSnapshot } from "./types";
import type { EconomicImpactRiskLevel } from "./economic-impact";

const FONT_DIR = path.join(process.cwd(), "src/lib/reports/fonts");
const FONT_HEADING = "Playfair Display";
const FONT_BODY = "Public Sans";

// Local TTF files (fetched once from Google Fonts) rather than a live font
// CDN URL, mirroring the local-file pattern already used for the AirCare TLS
// intermediate cert in src/lib/aircare/client.ts — no network dependency at
// render time in a serverless function.
Font.register({
  family: FONT_HEADING,
  fonts: [{ src: path.join(FONT_DIR, "PlayfairDisplay-Bold.ttf"), fontWeight: 700 }],
});
Font.register({
  family: FONT_BODY,
  fonts: [
    { src: path.join(FONT_DIR, "PublicSans-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "PublicSans-Bold.ttf"), fontWeight: 700 },
  ],
});

// The Eco Air Sense product wordmark (same file as public/logo.png, used on
// the login page) — kept as its own copy under src/lib/reports so it's
// bundled into the serverless function output the same way the fonts and
// the AirCare TLS cert are (files under public/ aren't guaranteed to be
// readable via fs at Vercel Function runtime).
const ECO_AIR_SENSE_LOGO_DATA_URL = `data:image/png;base64,${fs
  .readFileSync(path.join(process.cwd(), "src/lib/reports/assets/eco-air-sense-logo.png"))
  .toString("base64")}`;

const COLORS = {
  navy: "#1e2a4a",
  brass: "#b8934a",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  border: "#dddddd",
  good: "#2f9e5b",
  warning: "#c08a1f",
  critical: "#c0392b",
  bg: "#f7f7f8",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: FONT_BODY, color: COLORS.text },
  coverPage: { padding: 0 },
  h1: { fontSize: 19, fontFamily: FONT_HEADING, fontWeight: 700, color: COLORS.navy, marginBottom: 6 },
  h2: { fontSize: 14, fontFamily: FONT_HEADING, fontWeight: 700, color: COLORS.navy, marginTop: 18, marginBottom: 8 },
  h3: { fontSize: 11, fontFamily: FONT_HEADING, fontWeight: 700, color: COLORS.navy, marginTop: 10, marginBottom: 4 },
  sectionNum: { color: COLORS.brass },
  bold: { fontFamily: FONT_BODY, fontWeight: 700 },
  muted: { color: COLORS.muted, fontSize: 9 },
  section: { marginBottom: 8 },
  row: { flexDirection: "row" },
  labelCol: { width: "40%", color: COLORS.muted },
  valueCol: { width: "60%" },
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginVertical: 10 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.muted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  scoreCard: {
    width: "18%",
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginRight: "2%",
  },
  scoreValue: { fontSize: 19, fontFamily: FONT_BODY, fontWeight: 700 },
  scoreLabel: { fontSize: 7, color: COLORS.muted, marginBottom: 5 },
  table: { borderWidth: 1, borderColor: COLORS.border, marginTop: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  trAlt: { backgroundColor: COLORS.bg },
  trHeader: { flexDirection: "row", backgroundColor: COLORS.navy },
  td: { padding: 6, fontSize: 8.5, flex: 1 },
  thText: { padding: 6, fontSize: 8, fontFamily: FONT_BODY, fontWeight: 700, flex: 1, color: "#ffffff" },
  badge: { fontSize: 7.5, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, alignSelf: "flex-start" },
});

function bandColor(score: number | null, invert = false): string {
  if (score == null) return COLORS.muted;
  const effective = invert ? 100 - score : score;
  if (effective >= 61) return COLORS.good;
  if (effective >= 41) return COLORS.warning;
  return COLORS.critical;
}

function riskColor(level: EconomicImpactRiskLevel): string {
  if (level === "high") return COLORS.critical;
  if (level === "medium") return COLORS.warning;
  return COLORS.good;
}

function fmt(v: number | null | undefined, decimals = 1): string {
  return v == null ? "—" : v.toFixed(decimals);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Section heading with an auto-incrementing, brass-coloured number prefix.
 * `minPresenceAhead` is react-pdf's orphan/widow protection: it guarantees a
 * page break can't fall in the first N points after this element, so a
 * heading never ends up alone at the bottom of a page with its content
 * pushed to the next one.
 */
function SectionHeading({
  n,
  children,
  style = styles.h1,
  minPresenceAhead = 50,
}: {
  n: number;
  children: string;
  style?: Style;
  minPresenceAhead?: number;
}) {
  return (
    <Text style={style} minPresenceAhead={minPresenceAhead}>
      <Text style={styles.sectionNum}>{n}. </Text>
      {children}
    </Text>
  );
}

function ScoreCard({ label, score, invert = false }: { label: string; score: number | null; invert?: boolean }) {
  return (
    <View style={styles.scoreCard}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={[styles.scoreValue, { color: bandColor(score, invert) }]}>{score ?? "—"}</Text>
    </View>
  );
}

function BarChart({
  data,
  unit,
}: {
  data: { label: string; value: number }[];
  unit: string;
}) {
  const width = 500;
  const barHeight = 14;
  const gap = 7;
  const labelWidth = 140;
  const chartWidth = width - labelWidth - 50;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const height = data.length * (barHeight + gap);

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const barW = (d.value / maxVal) * chartWidth;
        const y = i * (barHeight + gap);
        return (
          <G key={d.label}>
            <Rect x={labelWidth} y={y} width={chartWidth} height={barHeight} fill={COLORS.bg} />
            <Rect x={labelWidth} y={y} width={Math.max(barW, 2)} height={barHeight} fill={COLORS.brass} />
          </G>
        );
      })}
      {data.map((d, i) => {
        const y = i * (barHeight + gap);
        return (
          <Text key={`label-${d.label}`} x={0} y={y + barHeight - 4} style={{ fontSize: 7.5 }}>
            {d.label}
          </Text>
        );
      })}
      {data.map((d, i) => {
        const barW = (d.value / maxVal) * chartWidth;
        const y = i * (barHeight + gap);
        return (
          <Text
            key={`value-${d.label}`}
            x={labelWidth + Math.max(barW, 2) + 4}
            y={y + barHeight - 4}
            style={{ fontSize: 7.5 }}
          >
            {d.value.toFixed(1)} {unit}
          </Text>
        );
      })}
    </Svg>
  );
}

function Footer({ yachtName }: { yachtName: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{yachtName} — Environmental Monitoring Report</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.labelCol}>{label}</Text>
      <Text style={styles.valueCol}>{value || "—"}</Text>
    </View>
  );
}

const PARAM_LABELS: Record<string, string> = {
  temperature: "Temperature",
  relative_humidity: "Relative Humidity",
  co2: "CO2",
  tvoc: "TVOC",
  pm2_5: "PM2.5",
  pm10: "PM10",
};

const RISK_LABEL: Record<EconomicImpactRiskLevel, string> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

export function ReportDocument({ snapshot }: { snapshot: ReportSnapshot }) {
  const {
    meta,
    yacht,
    coverage,
    scores,
    dataSummary,
    pointScores,
    economicImpact,
    gaPlan,
    aiInsights,
    dataQualityDetail,
  } = snapshot;

  // Sections are numbered in source order via this counter — JS evaluates
  // JSX children top-to-bottom as the tree is built, so this stays correct
  // through the conditional GA Plan page and the parameter loop without ever
  // needing manual renumbering when a section is added or removed.
  let sectionCount = 0;
  const n = () => ++sectionCount;

  return (
    <Document title={`${yacht.name} Environmental Monitoring Report`}>
      {/* Cover page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ flex: 1, backgroundColor: COLORS.navy, padding: 50, justifyContent: "space-between" }}>
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              {meta.companyLogoDataUrl ? (
                <View style={{ backgroundColor: "white", borderRadius: 4, padding: 8 }}>
                  <Image src={meta.companyLogoDataUrl} style={{ width: 170 }} />
                </View>
              ) : (
                <View />
              )}
              <View style={{ backgroundColor: "white", borderRadius: 4, padding: 8 }}>
                <Image src={ECO_AIR_SENSE_LOGO_DATA_URL} style={{ width: 100 }} />
              </View>
            </View>
            <Text style={{ color: "white", fontSize: 22, fontFamily: FONT_HEADING, fontWeight: 700, marginTop: 4, marginBottom: 6 }}>
              Environmental Monitoring Report
            </Text>
            <Text style={{ color: "#c9d2e8", fontSize: 14 }}>{yacht.name}</Text>
          </View>

          {yacht.photoDataUrl && (
            <Image
              src={yacht.photoDataUrl}
              style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 4 }}
            />
          )}

          <View>
            <Text style={{ color: "#c9d2e8", fontSize: 10, marginBottom: 4 }}>
              Reporting Period: {fmtDate(meta.periodStart)} – {fmtDate(meta.periodEnd)}
            </Text>
            <Text style={{ color: "#c9d2e8", fontSize: 10, marginBottom: 4 }}>
              Generated: {fmtDate(meta.generatedAt)} by {meta.generatedByName}
            </Text>
            <Text style={{ color: "#8493b8", fontSize: 8, marginTop: 20 }}>
              Environmental monitoring data for risk indication only — see Methodology & Limitations. Does not
              replace microbiological laboratory analysis, HVAC engineering assessment, or professional
              environmental investigation.
            </Text>
          </View>
        </View>
      </Page>

      {/* Main content — flows across pages automatically */}
      <Page size="A4" style={styles.page}>
        <Footer yachtName={yacht.name} />

        <SectionHeading n={n()}>Executive Summary</SectionHeading>
        {aiInsights ? (
          <View style={styles.section}>
            <KeyValueRow label="Overall Status" value={aiInsights.overallStatus} />
            <KeyValueRow label="Key Finding" value={aiInsights.keyFinding} />
            <KeyValueRow label="Main Risk" value={aiInsights.mainRisk} />
            <KeyValueRow label="Recommended Action" value={aiInsights.recommendedAction} />
            <KeyValueRow label="Priority" value={aiInsights.priority.toUpperCase()} />
          </View>
        ) : (
          <Text style={styles.muted}>No AI briefing available for this period.</Text>
        )}

        <View style={styles.divider} />
        <SectionHeading n={n()}>Monitoring Period</SectionHeading>
        <KeyValueRow label="Start" value={fmtDate(meta.periodStart)} />
        <KeyValueRow label="End" value={fmtDate(meta.periodEnd)} />

        <View style={styles.divider} />
        <SectionHeading n={n()}>Yacht Information</SectionHeading>
        <KeyValueRow label="Yacht Name" value={yacht.name} />
        <KeyValueRow label="Shipyard" value={yacht.shipyard ?? ""} />
        <KeyValueRow label="Type" value={yacht.yachtType ?? ""} />
        <KeyValueRow label="IMO Number" value={yacht.imoNumber ?? ""} />
        <KeyValueRow label="Flag" value={yacht.flag ?? ""} />
        <KeyValueRow label="Build Year" value={yacht.buildYear ? String(yacht.buildYear) : ""} />
        <KeyValueRow label="Length" value={yacht.lengthM ? `${yacht.lengthM} m` : ""} />
        <KeyValueRow label="Gross Tonnage" value={yacht.grossTonnage ? String(yacht.grossTonnage) : ""} />
        <KeyValueRow label="Owner" value={yacht.ownerName ?? ""} />
        <KeyValueRow label="Management Company" value={yacht.managementCompany ?? ""} />
        <KeyValueRow label="Captain" value={yacht.captainName ?? ""} />
        <KeyValueRow label="Monitoring Provider" value={yacht.monitoringProvider ?? ""} />
        <KeyValueRow label="Monitoring Frequency" value={yacht.monitoringFrequency ?? ""} />

        <View style={styles.divider} />
        <SectionHeading n={n()}>Monitoring Coverage</SectionHeading>
        <KeyValueRow label="Monitoring Points" value={String(coverage.totalPoints)} />
        <KeyValueRow label="Sensors Online" value={String(coverage.sensorsOnline)} />
        <KeyValueRow label="Sensors Offline" value={String(coverage.sensorsOffline)} />
        <KeyValueRow
          label="Monitoring Coverage"
          value={coverage.monitoringCoveragePct != null ? `${coverage.monitoringCoveragePct}%` : "—"}
        />
        <KeyValueRow label="Data Quality" value={coverage.dataQualityPct != null ? `${coverage.dataQualityPct}%` : "—"} />

        <View style={styles.divider} />
        <SectionHeading n={n()}>Environmental Overview</SectionHeading>
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <ScoreCard label="OVERALL SCORE" score={scores.overall} />
          <ScoreCard label="COMFORT INDEX" score={scores.comfort} />
          <ScoreCard label="BIOLOGICAL SAFETY" score={scores.biologicalSafety} />
          <ScoreCard label="MOULD RISK" score={scores.mouldRisk} invert />
          <ScoreCard label="LUXURY PERCEPTION" score={scores.luxuryPerception} />
        </View>
      </Page>

      {/* Parameter analysis */}
      <Page size="A4" style={styles.page}>
        <Footer yachtName={yacht.name} />
        {(["temperature", "relative_humidity", "co2", "tvoc", "pm2_5", "pm10"] as const).map((parameter) => {
          const rows = dataSummary.points
            .map((p) => ({ point: p, param: p.parameters.find((pp) => pp.parameter === parameter) }))
            .filter((r) => r.param);
          if (rows.length === 0) return null;
          const unit = rows[0].param!.unit;
          return (
            <View key={parameter} wrap={false} style={{ marginBottom: 16 }}>
              <SectionHeading n={n()} style={styles.h2}>
                {`${PARAM_LABELS[parameter]} Analysis`}
              </SectionHeading>
              <BarChart data={rows.map((r) => ({ label: r.point.pointName, value: r.param!.avg }))} unit={unit} />
              <View style={styles.table}>
                <View style={styles.trHeader} minPresenceAhead={30}>
                  <Text style={styles.thText}>Point</Text>
                  <Text style={styles.thText}>Avg</Text>
                  <Text style={styles.thText}>Min</Text>
                  <Text style={styles.thText}>Max</Text>
                  <Text style={styles.thText}>Trend</Text>
                </View>
                {rows.map((r, i) => (
                  <View key={r.point.pointId} style={[styles.tr, i % 2 === 1 ? styles.trAlt : undefined]} wrap={false}>
                    <Text style={styles.td}>{r.point.pointName}</Text>
                    <Text style={styles.td}>{fmt(r.param!.avg)}</Text>
                    <Text style={styles.td}>{fmt(r.param!.min)}</Text>
                    <Text style={styles.td}>{fmt(r.param!.max)}</Text>
                    <Text style={styles.td}>
                      {r.param!.trendDirection}
                      {r.param!.trendChangePct != null ? ` (${r.param!.trendChangePct > 0 ? "+" : ""}${r.param!.trendChangePct}%)` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </Page>

      {/* Scoring indices detail */}
      <Page size="A4" style={styles.page}>
        <Footer yachtName={yacht.name} />
        <SectionHeading n={n()}>Comfort Index — By Monitoring Point</SectionHeading>
        <ScoreTable rows={pointScores} field="comfort" />

        <SectionHeading n={n()}>Mould Risk Index — By Monitoring Point</SectionHeading>
        <Text style={styles.muted}>
          Moisture-driven risk indicator. Higher = more risk. Not a mould detection or laboratory test.
        </Text>
        <ScoreTable rows={pointScores} field="mouldRisk" invert />

        <SectionHeading n={n()}>Biological Safety Indicator — By Monitoring Point</SectionHeading>
        <Text style={styles.muted}>
          Environmental favourability indicator. Does not confirm presence or absence of any organism.
        </Text>
        <ScoreTable rows={pointScores} field="biologicalSafety" />

        <SectionHeading n={n()}>Luxury Perception Index — By Monitoring Point</SectionHeading>
        <ScoreTable rows={pointScores} field="luxuryPerception" />
      </Page>

      {/* Alerts & Anomalies */}
      <Page size="A4" style={styles.page}>
        <Footer yachtName={yacht.name} />
        <SectionHeading n={n()}>Alerts & Anomalies</SectionHeading>
        {dataSummary.openAlerts.length === 0 ? (
          <Text style={styles.muted}>No sustained alerts open during this reporting period.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.trHeader} minPresenceAhead={30}>
              <Text style={styles.thText}>Point</Text>
              <Text style={styles.thText}>Parameter</Text>
              <Text style={styles.thText}>Severity</Text>
              <Text style={styles.thText}>Value</Text>
              <Text style={styles.thText}>Duration</Text>
            </View>
            {dataSummary.openAlerts.map((a, i) => (
              <View key={i} style={[styles.tr, i % 2 === 1 ? styles.trAlt : undefined]} wrap={false}>
                <Text style={styles.td}>{a.pointName}</Text>
                <Text style={styles.td}>{PARAM_LABELS[a.parameter] ?? a.parameter}</Text>
                <Text style={[styles.td, { color: a.severity === "critical" ? COLORS.critical : COLORS.warning }]}>
                  {a.severity}
                </Text>
                <Text style={styles.td}>{fmt(a.currentValue)}</Text>
                <Text style={styles.td}>{a.durationHours}h</Text>
              </View>
            ))}
          </View>
        )}

        <SectionHeading n={n()}>Monitoring Point Analysis</SectionHeading>
        <View style={styles.table}>
          <View style={styles.trHeader} minPresenceAhead={30}>
            <Text style={styles.thText}>Point</Text>
            <Text style={styles.thText}>Overall</Text>
            <Text style={styles.thText}>Comfort</Text>
            <Text style={styles.thText}>Bio Safety</Text>
            <Text style={styles.thText}>Mould Risk</Text>
            <Text style={styles.thText}>Luxury</Text>
          </View>
          {pointScores.map((p, i) => (
            <View key={p.pointId} style={[styles.tr, i % 2 === 1 ? styles.trAlt : undefined]} wrap={false}>
              <Text style={styles.td}>{p.pointName}</Text>
              <Text style={styles.td}>{p.overall ?? "—"}</Text>
              <Text style={styles.td}>{p.comfort ?? "—"}</Text>
              <Text style={styles.td}>{p.biologicalSafety ?? "—"}</Text>
              <Text style={styles.td}>{p.mouldRisk ?? "—"}</Text>
              <Text style={styles.td}>{p.luxuryPerception ?? "—"}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* GA Plan Risk Map */}
      {gaPlan.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Footer yachtName={yacht.name} />
          <SectionHeading n={n()}>GA Plan Risk Map</SectionHeading>
          <Text style={styles.muted}>
            Mould Risk Index by pin position. Colours are an analytical overlay at discrete monitoring points, not
            interpolated continuous measurement.
          </Text>
          {gaPlan.map((deck) => (
            <View key={deck.deckName} wrap={false} style={{ marginTop: 12 }}>
              <Text style={styles.h3}>{deck.deckName}</Text>
              {deck.imageDataUrl ? (
                <Image src={deck.imageDataUrl} style={{ width: 500 }} />
              ) : (
                <Text style={styles.muted}>Plan image unavailable.</Text>
              )}
              {deck.pins.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                  {deck.pins.map((pin, i) => (
                    <View key={i} style={{ flexDirection: "row", alignItems: "center", width: "33%", marginBottom: 4 }}>
                      <Svg width={8} height={8} style={{ marginRight: 4 }}>
                        <Circle cx={4} cy={4} r={4} fill={bandColor(pin.mouldRiskScore, true)} />
                      </Svg>
                      <Text style={{ fontSize: 8 }}>
                        {pin.pointName} ({pin.mouldRiskScore ?? "—"})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </Page>
      )}

      {/* Final Analysis — consolidated results, interpretation, recommendations and economic impact */}
      <Page size="A4" style={styles.page}>
        <Footer yachtName={yacht.name} />
        <SectionHeading n={n()}>Final Analysis — Sampling Period</SectionHeading>

        <Text style={styles.h3} minPresenceAhead={50}>Summary</Text>
        <Text style={{ marginBottom: 4 }}>
          {aiInsights?.overallStatus ?? `Overall Environmental Score for the period: ${scores.overall ?? "—"}/100.`}
        </Text>
        {aiInsights?.keyFinding && <Text style={{ marginBottom: 4 }}>{aiInsights.keyFinding}</Text>}
        {aiInsights?.mainRisk && <Text style={{ color: COLORS.muted }}>{aiInsights.mainRisk}</Text>}

        <Text style={styles.h3} minPresenceAhead={50}>Results & Interpretation</Text>
        {aiInsights && aiInsights.findings.length > 0 ? (
          <>
            <Text style={styles.muted}>
              Engine: {aiInsights.engine === "claude" ? "Claude AI" : "Rule-based summary (no AI model configured)"}
            </Text>
            {aiInsights.findings.map((f, i) => (
              <View key={i} wrap={false} style={{ marginTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                <Text style={[styles.bold, { fontSize: 9 }]}>
                  {f.pointName ? `${f.pointName} — ` : ""}
                  {f.insightType.toUpperCase()} ({f.confidenceLevel} confidence, {f.priority} priority)
                </Text>
                <Text style={{ marginTop: 3 }}>
                  <Text style={styles.bold}>Result: </Text>
                  {f.fact}
                </Text>
                <Text style={{ marginTop: 2, color: COLORS.muted }}>
                  <Text style={styles.bold}>Interpretation: </Text>
                  {f.interpretation}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.muted}>No specific findings this period.</Text>
        )}

        <Text style={styles.h3} minPresenceAhead={50}>Recommendations</Text>
        {aiInsights && aiInsights.findings.length > 0 ? (
          aiInsights.findings.map((f, i) => (
            <Text key={i} style={{ marginBottom: 4 }}>
              • {f.recommendation}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>No specific actions recommended this period.</Text>
        )}

        <Text style={styles.h3} minPresenceAhead={50}>Estimated Economic Impact of Corrective Action</Text>
        <Text style={[styles.muted, { marginBottom: 6 }]}>
          Risk-level indication only, based on this period&apos;s collected data — not a certified financial
          estimate, and not a substitute for a professional cost-benefit analysis. No monetary figures are
          projected because this app has no reliable basis for this yacht&apos;s specific energy or remediation
          costs.
        </Text>
        {economicImpact.length === 0 ? (
          <Text style={styles.muted}>No elevated cost-risk items identified this period.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.trHeader} minPresenceAhead={30}>
              <Text style={styles.thText}>Point / Parameter</Text>
              <Text style={[styles.thText, { flex: 0.6 }]}>Risk</Text>
              <Text style={styles.thText}>Cost Category</Text>
              <Text style={{ ...styles.thText, flex: 2 }}>Description</Text>
            </View>
            {economicImpact.map((item, i) => (
              <View key={i} style={[styles.tr, i % 2 === 1 ? styles.trAlt : undefined]} wrap={false}>
                <Text style={styles.td}>{item.pointName ?? "—"}</Text>
                <Text style={[styles.td, { flex: 0.6, color: riskColor(item.riskLevel), fontFamily: FONT_BODY, fontWeight: 700 }]}>
                  {RISK_LABEL[item.riskLevel]}
                </Text>
                <Text style={styles.td}>{item.costCategories.join(", ")}</Text>
                <Text style={{ ...styles.td, flex: 2 }}>{item.description}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.divider} />
        <Text style={styles.h3} minPresenceAhead={50}>Conclusion</Text>
        <Text>{aiInsights?.recommendedAction ?? "Continue routine monitoring — no action required at this time."}</Text>
      </Page>

      {/* Data Quality, Methodology */}
      <Page size="A4" style={styles.page}>
        <Footer yachtName={yacht.name} />
        <SectionHeading n={n()}>Data Quality</SectionHeading>
        <KeyValueRow
          label="Last Import"
          value={dataQualityDetail.lastImportDate ? fmtDate(dataQualityDetail.lastImportDate) : "—"}
        />
        <KeyValueRow label="Records Imported" value={String(dataQualityDetail.lastImportRecordsImported)} />
        <KeyValueRow label="Records Rejected" value={String(dataQualityDetail.lastImportRecordsRejected)} />
        <KeyValueRow label="Data Quality Score" value={coverage.dataQualityPct != null ? `${coverage.dataQualityPct}%` : "—"} />

        <View style={styles.divider} />
        <SectionHeading n={n()}>Methodology & Limitations</SectionHeading>
        <Text style={{ marginBottom: 6 }}>
          Comfort, Biological Safety and Luxury Perception indices are weighted blends of parameter readings scored
          against configured threshold bands (preferred/warning/critical). Mould Risk Index is primarily
          humidity-driven, with temperature as an aggravating factor, a dew-point proximity check, sustained-breach
          persistence, and TVOC as a minor contextual signal only. All weights and thresholds are configurable in
          Settings and sourced from ASHRAE, WELL Building Standard and EPA/WHO air quality guidance.
        </Text>
        <Text style={{ marginBottom: 6 }}>
          The Estimated Economic Impact section classifies risk level and cost category from deterministic rules
          over this period&apos;s alerts and scores — it does not project a monetary amount and should not be read
          as a financial estimate.
        </Text>
        <Text style={{ color: COLORS.muted }}>
          This report is generated from sensor data for environmental monitoring and risk indication only. It does
          not replace microbiological laboratory analysis, HVAC engineering assessment, Legionella risk assessment,
          professional mould inspection, or other professional environmental investigation. AI interpretations are
          decision-support information, not medical, microbiological or engineering certification.
        </Text>
      </Page>
    </Document>
  );
}

function ScoreTable({
  rows,
  field,
  invert = false,
}: {
  rows: ReportSnapshot["pointScores"];
  field: "comfort" | "mouldRisk" | "biologicalSafety" | "luxuryPerception";
  invert?: boolean;
}) {
  return (
    <View style={styles.table}>
      <View style={styles.trHeader} minPresenceAhead={30}>
        <Text style={styles.thText}>Point</Text>
        <Text style={styles.thText}>Score</Text>
      </View>
      {rows.map((r, i) => (
        <View key={r.pointId} style={[styles.tr, i % 2 === 1 ? styles.trAlt : undefined]} wrap={false}>
          <Text style={styles.td}>{r.pointName}</Text>
          <Text style={[styles.td, { color: bandColor(r[field], invert), fontFamily: FONT_BODY, fontWeight: 700 }]}>
            {r[field] ?? "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}
