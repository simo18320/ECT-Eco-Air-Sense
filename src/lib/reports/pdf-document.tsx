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
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReportSnapshot } from "./types";

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
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: COLORS.text },
  coverPage: { padding: 0 },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", color: COLORS.navy, marginBottom: 4 },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", color: COLORS.navy, marginTop: 18, marginBottom: 8 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COLORS.navy, marginTop: 10, marginBottom: 4 },
  muted: { color: COLORS.muted, fontSize: 9 },
  section: { marginBottom: 6 },
  row: { flexDirection: "row" },
  labelCol: { width: "40%", color: COLORS.muted },
  valueCol: { width: "60%" },
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginVertical: 8 },
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
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginRight: "2%",
  },
  scoreValue: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  scoreLabel: { fontSize: 7, color: COLORS.muted, marginBottom: 4 },
  table: { borderWidth: 1, borderColor: COLORS.border, marginTop: 4 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  trHeader: { flexDirection: "row", backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  td: { padding: 5, fontSize: 8.5, flex: 1 },
  thText: { padding: 5, fontSize: 8, fontFamily: "Helvetica-Bold", flex: 1, color: COLORS.navy },
  badge: { fontSize: 7.5, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, alignSelf: "flex-start" },
});

function bandColor(score: number | null, invert = false): string {
  if (score == null) return COLORS.muted;
  const effective = invert ? 100 - score : score;
  if (effective >= 61) return COLORS.good;
  if (effective >= 41) return COLORS.warning;
  return COLORS.critical;
}

function fmt(v: number | null | undefined, decimals = 1): string {
  return v == null ? "—" : v.toFixed(decimals);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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
  const gap = 6;
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
            <Rect x={labelWidth} y={y} width={Math.max(barW, 2)} height={barHeight} fill={COLORS.navy} />
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

export function ReportDocument({ snapshot }: { snapshot: ReportSnapshot }) {
  const { meta, yacht, coverage, scores, dataSummary, pointScores, gaPlan, aiInsights, dataQualityDetail } = snapshot;

  return (
    <Document title={`${yacht.name} Environmental Monitoring Report`}>
      {/* Cover page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ flex: 1, backgroundColor: COLORS.navy, padding: 50, justifyContent: "space-between" }}>
          <View>
            {meta.companyLogoDataUrl && <Image src={meta.companyLogoDataUrl} style={{ width: 90, marginBottom: 30 }} />}
            <Text style={{ color: "#f0ad4e", fontSize: 9, letterSpacing: 2, marginBottom: 10 }}>
              {meta.companyName.toUpperCase()}
            </Text>
            <Text style={{ color: "white", fontSize: 26, fontFamily: "Helvetica-Bold", marginBottom: 6 }}>
              Eco Air Sense Monitoring Report
            </Text>
            <Text style={{ color: "#c9d2e8", fontSize: 14 }}>{yacht.name}</Text>
          </View>
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

        <Text style={styles.h1}>1. Executive Summary</Text>
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
        <Text style={styles.h1}>2. Monitoring Period</Text>
        <KeyValueRow label="Start" value={fmtDate(meta.periodStart)} />
        <KeyValueRow label="End" value={fmtDate(meta.periodEnd)} />

        <View style={styles.divider} />
        <Text style={styles.h1}>3. Yacht Information</Text>
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
        <Text style={styles.h1}>4. Monitoring Coverage</Text>
        <KeyValueRow label="Monitoring Points" value={String(coverage.totalPoints)} />
        <KeyValueRow label="Sensors Online" value={String(coverage.sensorsOnline)} />
        <KeyValueRow label="Sensors Offline" value={String(coverage.sensorsOffline)} />
        <KeyValueRow
          label="Monitoring Coverage"
          value={coverage.monitoringCoveragePct != null ? `${coverage.monitoringCoveragePct}%` : "—"}
        />
        <KeyValueRow label="Data Quality" value={coverage.dataQualityPct != null ? `${coverage.dataQualityPct}%` : "—"} />

        <View style={styles.divider} />
        <Text style={styles.h1}>5. Environmental Overview</Text>
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
        {(["temperature", "relative_humidity", "co2", "tvoc", "pm2_5", "pm10"] as const).map((parameter, idx) => {
          const rows = dataSummary.points
            .map((p) => ({ point: p, param: p.parameters.find((pp) => pp.parameter === parameter) }))
            .filter((r) => r.param);
          if (rows.length === 0) return null;
          const unit = rows[0].param!.unit;
          return (
            <View key={parameter} wrap={false} style={{ marginBottom: 16 }}>
              <Text style={styles.h2}>
                {idx + 6}. {PARAM_LABELS[parameter]} Analysis
              </Text>
              <BarChart data={rows.map((r) => ({ label: r.point.pointName, value: r.param!.avg }))} unit={unit} />
              <View style={styles.table}>
                <View style={styles.trHeader}>
                  <Text style={styles.thText}>Point</Text>
                  <Text style={styles.thText}>Avg</Text>
                  <Text style={styles.thText}>Min</Text>
                  <Text style={styles.thText}>Max</Text>
                  <Text style={styles.thText}>Trend</Text>
                </View>
                {rows.map((r) => (
                  <View key={r.point.pointId} style={styles.tr}>
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
        <Text style={styles.h1}>11. Comfort Index — By Monitoring Point</Text>
        <ScoreTable rows={pointScores} field="comfort" />

        <Text style={styles.h1}>12. Mould Risk Index — By Monitoring Point</Text>
        <Text style={styles.muted}>
          Moisture-driven risk indicator. Higher = more risk. Not a mould detection or laboratory test.
        </Text>
        <ScoreTable rows={pointScores} field="mouldRisk" invert />

        <Text style={styles.h1}>13. Biological Safety Indicator — By Monitoring Point</Text>
        <Text style={styles.muted}>
          Environmental favourability indicator. Does not confirm presence or absence of any organism.
        </Text>
        <ScoreTable rows={pointScores} field="biologicalSafety" />

        <Text style={styles.h1}>14. Luxury Perception Index — By Monitoring Point</Text>
        <ScoreTable rows={pointScores} field="luxuryPerception" />
      </Page>

      {/* Alerts & Anomalies */}
      <Page size="A4" style={styles.page}>
        <Footer yachtName={yacht.name} />
        <Text style={styles.h1}>15. Alerts & Anomalies</Text>
        {dataSummary.openAlerts.length === 0 ? (
          <Text style={styles.muted}>No sustained alerts open during this reporting period.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.trHeader}>
              <Text style={styles.thText}>Point</Text>
              <Text style={styles.thText}>Parameter</Text>
              <Text style={styles.thText}>Severity</Text>
              <Text style={styles.thText}>Value</Text>
              <Text style={styles.thText}>Duration</Text>
            </View>
            {dataSummary.openAlerts.map((a, i) => (
              <View key={i} style={styles.tr}>
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

        <Text style={styles.h1}>16. Monitoring Point Analysis</Text>
        <View style={styles.table}>
          <View style={styles.trHeader}>
            <Text style={styles.thText}>Point</Text>
            <Text style={styles.thText}>Overall</Text>
            <Text style={styles.thText}>Comfort</Text>
            <Text style={styles.thText}>Bio Safety</Text>
            <Text style={styles.thText}>Mould Risk</Text>
            <Text style={styles.thText}>Luxury</Text>
          </View>
          {pointScores.map((p) => (
            <View key={p.pointId} style={styles.tr}>
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
          <Text style={styles.h1}>17. GA Plan Risk Map</Text>
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

      {/* AI Interpretation & Recommendations */}
      <Page size="A4" style={styles.page}>
        <Footer yachtName={yacht.name} />
        <Text style={styles.h1}>18. AI Interpretation</Text>
        {aiInsights ? (
          <>
            <Text style={styles.muted}>
              Engine: {aiInsights.engine === "claude" ? "Claude AI" : "Rule-based summary (no AI model configured)"}
            </Text>
            {aiInsights.findings.map((f, i) => (
              <View key={i} wrap={false} style={{ marginTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>
                  {f.pointName ? `${f.pointName} — ` : ""}
                  {f.insightType.toUpperCase()} ({f.confidenceLevel} confidence, {f.priority} priority)
                </Text>
                <Text style={{ marginTop: 3 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>Fact: </Text>
                  {f.fact}
                </Text>
                <Text style={{ marginTop: 2, color: COLORS.muted }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>Interpretation: </Text>
                  {f.interpretation}
                </Text>
                <Text style={{ marginTop: 2, color: COLORS.muted }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>Recommendation: </Text>
                  {f.recommendation}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.muted}>No AI insights generated for this period.</Text>
        )}

        <Text style={styles.h1}>19. Recommended Actions</Text>
        {aiInsights && aiInsights.findings.length > 0 ? (
          aiInsights.findings.map((f, i) => (
            <Text key={i} style={{ marginBottom: 4 }}>
              • {f.recommendation}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>No specific actions recommended this period.</Text>
        )}
      </Page>

      {/* Data Quality, Methodology, Conclusion */}
      <Page size="A4" style={styles.page}>
        <Footer yachtName={yacht.name} />
        <Text style={styles.h1}>20. Data Quality</Text>
        <KeyValueRow
          label="Last Import"
          value={dataQualityDetail.lastImportDate ? fmtDate(dataQualityDetail.lastImportDate) : "—"}
        />
        <KeyValueRow label="Records Imported" value={String(dataQualityDetail.lastImportRecordsImported)} />
        <KeyValueRow label="Records Rejected" value={String(dataQualityDetail.lastImportRecordsRejected)} />
        <KeyValueRow label="Data Quality Score" value={coverage.dataQualityPct != null ? `${coverage.dataQualityPct}%` : "—"} />

        <View style={styles.divider} />
        <Text style={styles.h1}>21. Methodology & Limitations</Text>
        <Text style={{ marginBottom: 6 }}>
          Comfort, Biological Safety and Luxury Perception indices are weighted blends of parameter readings scored
          against configured threshold bands (preferred/warning/critical). Mould Risk Index is primarily
          humidity-driven, with temperature as an aggravating factor, a dew-point proximity check, sustained-breach
          persistence, and TVOC as a minor contextual signal only. All weights and thresholds are configurable in
          Settings and sourced from ASHRAE, WELL Building Standard and EPA/WHO air quality guidance.
        </Text>
        <Text style={{ color: COLORS.muted }}>
          This report is generated from sensor data for environmental monitoring and risk indication only. It does
          not replace microbiological laboratory analysis, HVAC engineering assessment, Legionella risk assessment,
          professional mould inspection, or other professional environmental investigation. AI interpretations are
          decision-support information, not medical, microbiological or engineering certification.
        </Text>

        <View style={styles.divider} />
        <Text style={styles.h1}>22. Conclusion</Text>
        <Text>
          {aiInsights?.overallStatus ?? `Overall Environmental Score for the period: ${scores.overall ?? "—"}/100.`}{" "}
          {aiInsights?.recommendedAction ?? ""}
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
      <View style={styles.trHeader}>
        <Text style={styles.thText}>Point</Text>
        <Text style={styles.thText}>Score</Text>
      </View>
      {rows.map((r) => (
        <View key={r.pointId} style={styles.tr}>
          <Text style={styles.td}>{r.pointName}</Text>
          <Text style={[styles.td, { color: bandColor(r[field], invert), fontFamily: "Helvetica-Bold" }]}>
            {r[field] ?? "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}
