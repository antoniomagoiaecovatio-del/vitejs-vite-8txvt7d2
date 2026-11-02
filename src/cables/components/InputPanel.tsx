

import { FR_OPTIONS } from "../lib/data/factors";
import { CIRCUITS } from "../lib/engine/calc";
import { isBuried, usesConduit } from "../lib/engine/rules";
import type {
  BuriedSpacing,
  CalcInputs,
  CircuitType,
  DcInstallation,
  FamilyChoice,
  Routing,
} from "../lib/engine/types";
import { Card, NumberField, Row, Segmented, SelectField, Toggle } from "./ui";

type Set = <K extends keyof CalcInputs>(key: K, value: CalcInputs[K]) => void;

const ROUTINGS: { value: Routing; label: string }[] = [
  { value: "cano", label: "Caño embutido o a la vista" },
  { value: "bandeja_perforada", label: "Bandeja perforada" },
  { value: "bandeja_escalera", label: "Bandeja escalera / canasta" },
  { value: "bandeja_ciega", label: "Bandeja no perforada / sobre pared" },
  { value: "cano_enterrado", label: "Caño enterrado" },
  { value: "enterrado", label: "Directamente enterrado" },
];

const DC_INSTALLATIONS: { value: DcInstallation; label: string }[] = [
  { value: "PV_SURF2", label: "Sobre superficie, + y − en contacto (string típico)" },
  { value: "PV_SURF1", label: "Sobre superficie, cable único" },
  { value: "PV_AIR", label: "Al aire, suspendido" },
  { value: "PV_BURIED", label: "En caño enterrado (dato provisorio)" },
];

const CIRCUIT_OPTIONS = (Object.keys(CIRCUITS) as CircuitType[]).map((k) => ({
  value: k,
  label: `${CIRCUITS[k].label} — ΔU ≤ ${CIRCUITS[k].du} %`,
}));

export function InputPanel({ inputs, set }: { inputs: CalcInputs; set: Set }) {
  const isAC = inputs.side === "AC";
  const buried = isBuried(inputs);
  const conduit = usesConduit(inputs);
  const openTray = isAC && (inputs.routing === "bandeja_perforada" || inputs.routing === "bandeja_escalera");
  // El espaciado entre circuitos cambia la tabla de agrupamiento: multipolares espaciados o ternas en trébol separadas.
  const uniTrefoil = inputs.cableForm === "uni" && inputs.uniArrangement === "trebol";
  const spacedOk =
    (openTray && (inputs.cableForm === "multi" || uniTrefoil)) || (!isAC && inputs.dcInstallation !== "PV_BURIED");
  const spacedLabel =
    isAC && uniTrefoil
      ? "Ternas separadas entre sí al menos 2 diámetros (tabla IEC de trébol espaciado)"
      : "Circuitos espaciados más de un diámetro (sin reducción por agrupamiento)";

  const buriedSpacingOptions: { value: BuriedSpacing; label: string }[] =
    isAC && inputs.routing === "enterrado"
      ? [
          { value: "contacto", label: "En contacto" },
          { value: "1d", label: "Separados 1 diámetro de cable" },
          { value: "0.125", label: "Separados 0,125 m" },
          { value: "0.25", label: "Separados 0,25 m" },
          { value: "0.5", label: "Separados 0,5 m o más" },
        ]
      : [
          { value: "contacto", label: "Caños en contacto" },
          { value: "0.25", label: "Caños separados 0,25 m" },
          { value: "0.5", label: "Caños separados 0,5 m" },
          { value: "1.0", label: "Caños separados 1 m o más" },
        ];

  const familyOptions: { value: FamilyChoice; label: string }[] = isAC
    ? [
        { value: "auto", label: "Automático (según norma y ambiente)" },
        { value: "pvc", label: "Aislación PVC / envoltura PVC — IRAM 2178-1" },
        { value: "xlpe", label: "Aislación XLPE / envoltura PVC — IRAM 2178-1" },
        { value: "lsoh", label: "Aislación XLPE / envoltura LSOH — IRAM 62266" },
      ]
    : [
        { value: "auto", label: "Cable solar H1Z2Z2-K — IRAM 62930" },
        { value: "pvc", label: "PVC/PVC IRAM 2178-1 (cable de CA)" },
        { value: "xlpe", label: "XLPE/PVC IRAM 2178-1 (cable de CA)" },
        { value: "lsoh", label: "XLPE/LSOH IRAM 62266 (cable de CA)" },
      ];

  return (
    <div className="space-y-4">
      <Card step={1} title="Sistema">
        <Segmented
          value={inputs.side}
          onChange={(v) => {
            set("side", v);
            set("family", "auto");
          }}
          options={[
            { value: "AC", label: "Corriente alterna (BT)" },
            { value: "DC", label: "Corriente continua (FV)" },
          ]}
        />
        {isAC ? (
          <>
            <Row>
              <Segmented
                label="Fases"
                value={inputs.phase}
                onChange={(v) => {
                  set("phase", v);
                  set("voltage", v === "mono" ? 220 : 380);
                }}
                options={[
                  { value: "mono", label: "Monofásica" },
                  { value: "tri", label: "Trifásica" },
                ]}
              />
              <NumberField
                label="Tensión"
                hint={inputs.phase === "tri" ? "(línea)" : "(fase-neutro)"}
                unit="V"
                value={inputs.voltage}
                onChange={(v) => set("voltage", v)}
              />
            </Row>
            {inputs.phase === "tri" && (
              <Segmented
                label="Conductor neutro"
                value={inputs.withNeutral ? "si" : "no"}
                onChange={(v) => set("withNeutral", v === "si")}
                options={[
                  { value: "si", label: "Con neutro (3F + N)" },
                  { value: "no", label: "Sin neutro (3F)" },
                ]}
              />
            )}
            <SelectField
              label="Tipo de circuito"
              value={inputs.circuitType}
              onChange={(v) => set("circuitType", v)}
              options={CIRCUIT_OPTIONS}
            />
          </>
        ) : (
          <>
            <Segmented
              label="Tramo de CC"
              value={inputs.dcRole}
              onChange={(v) => set("dcRole", v)}
              options={[
                { value: "string", label: "Cable de cadena (string)" },
                { value: "principal", label: "Cable principal de CC" },
              ]}
            />
            <Segmented
              label="Límite de caída de tensión (AEA 712)"
              value={inputs.dcLimitPct}
              onChange={(v) => set("dcLimitPct", v)}
              options={[
                { value: 1, label: "1,0 % recomendado" },
                { value: 1.5, label: "1,5 % máximo" },
              ]}
            />
          </>
        )}
      </Card>

      <Card step={2} title={isAC ? (inputs.circuitType === "inversor" ? "Inversor" : "Carga") : "Generador FV"}>
        {isAC ? (
          <>
            <Segmented
              value={inputs.loadMode}
              onChange={(v) => set("loadMode", v)}
              options={[
                { value: "power", label: "Por potencia" },
                {
                  value: "current",
                  label: inputs.circuitType === "inversor" ? "Por I máx. de salida" : "Por corriente",
                },
              ]}
            />
            <Row>
              {inputs.loadMode === "power" ? (
                <NumberField label="Potencia activa" unit="kW" value={inputs.powerKw} onChange={(v) => set("powerKw", v)} />
              ) : (
                <NumberField
                  label={inputs.circuitType === "inversor" ? "I máx. de salida CA" : "Corriente I_B"}
                  unit="A"
                  value={inputs.current}
                  onChange={(v) => set("current", v)}
                />
              )}
              <NumberField label="cos φ" value={inputs.cosPhi} onChange={(v) => set("cosPhi", v)} />
            </Row>
            {inputs.circuitType === "inversor" && (
              <>
                <NumberField
                  label="Factor de margen sobre I_B"
                  hint="(1 = I máx. del manual; > 1 solo margen propio)"
                  value={inputs.serviceFactor}
                  onChange={(v) => set("serviceFactor", v)}
                />
              </>
            )}
          </>
        ) : (
          <>
            <Row>
              <NumberField label="I_sc CEN del módulo" unit="A" value={inputs.iscStc} onChange={(v) => set("iscStc", v)} />
              <NumberField label="I_mp CEN del módulo" unit="A" value={inputs.impStc} onChange={(v) => set("impStc", v)} />
            </Row>
            <Row>
              <NumberField label="V_mp de la cadena" unit="V" value={inputs.vmpString} onChange={(v) => set("vmpString", v)} />
              {inputs.dcRole === "principal" ? (
                <NumberField label="Cadenas en paralelo (N)" value={inputs.nStrings} onChange={(v) => set("nStrings", v)} />
              ) : (
                <NumberField
                  label="Cadenas en paralelo"
                  hint="(en la entrada)"
                  value={inputs.stringsAtCombiner}
                  onChange={(v) => set("stringsAtCombiner", v)}
                />
              )}
            </Row>
            {inputs.dcRole === "string" && (
              <NumberField
                label="Fusible serie máx. del módulo"
                hint="(hoja de datos, 0 = sin dato)"
                unit="A"
                value={inputs.moduleMaxFuse}
                onChange={(v) => set("moduleMaxFuse", v)}
              />
            )}
          </>
        )}
      </Card>

      <Card step={3} title="Canalización">
        <Row>
          <NumberField label="Longitud del tramo" hint="(ida)" unit="m" value={inputs.lengthM} onChange={(v) => set("lengthM", v)} />
          <NumberField
            label="ΔU máx. de proyecto"
            hint="(0 = reglam.)"
            unit="%"
            value={inputs.duLimitOverride}
            onChange={(v) => set("duLimitOverride", v)}
          />
        </Row>
        {isAC ? (
          <>
            <SelectField label="Tipo de canalización" value={inputs.routing} onChange={(v) => set("routing", v)} options={ROUTINGS} />
            <Segmented
              label="Formación del cable"
              value={inputs.cableForm}
              onChange={(v) => set("cableForm", v)}
              options={[
                { value: "multi", label: "Multipolar" },
                { value: "uni", label: "Unipolares" },
              ]}
            />
            {inputs.routing === "enterrado" && inputs.cableForm === "uni" && (
              <SelectField
                label="Disposición de los unipolares"
                value={inputs.buriedArrangement}
                onChange={(v) => set("buriedArrangement", v)}
                options={[
                  { value: "trebol", label: "En contacto, en trébol" },
                  { value: "plano", label: "En contacto, en plano" },
                  { value: "plano_sep", label: "En plano, separados 1 diámetro" },
                ]}
              />
            )}
            {openTray && inputs.cableForm === "uni" && (
              <SelectField
                label="Disposición de los unipolares"
                value={inputs.uniArrangement}
                onChange={(v) => set("uniArrangement", v)}
                options={[
                  { value: "trebol", label: "En contacto, en trébol" },
                  { value: "plano", label: "En contacto, en plano" },
                  { value: "sep_horiz", label: "Separados un diámetro, horizontal" },
                  { value: "sep_vert", label: "Separados un diámetro, vertical" },
                ]}
              />
            )}
          </>
        ) : (
          <SelectField
            label="Modo de instalación"
            value={inputs.dcInstallation}
            onChange={(v) => set("dcInstallation", v)}
            options={DC_INSTALLATIONS}
          />
        )}
        {buried && (
          <SelectField
            label="Separación entre circuitos enterrados"
            hint="(agrupamiento IEC)"
            value={
              buriedSpacingOptions.some((o) => o.value === inputs.buriedSpacing) ? inputs.buriedSpacing : "contacto"
            }
            onChange={(v) => set("buriedSpacing", v)}
            options={buriedSpacingOptions}
          />
        )}
        {conduit && (
          <SelectField
            label="Tipo de caño"
            value={inputs.conduit}
            onChange={(v) => set("conduit", v)}
            options={[
              { value: "rigido", label: "Sintético rígido autoextinguible" },
              { value: "corrugado_autoext", label: "Corrugado autoextinguible (negro / gris / blanco)" },
              { value: "metalico", label: "Metálico" },
              { value: "corrugado_naranja", label: "Corrugado liviano naranja" },
            ]}
          />
        )}
        <Row>
          <NumberField
            label="Circuitos agrupados"
            hint="(incl. este)"
            value={inputs.circuits}
            onChange={(v) => set("circuits", Math.round(v))}
          />
          <SelectField
            label="Conductores en paralelo"
            hint="(por polo)"
            value={inputs.parallel}
            onChange={(v) => set("parallel", v)}
            options={[
              { value: 0, label: "Automático (mín. ternas, hasta 300 mm²)" },
              ...[1, 2, 3, 4, 5, 6, 7, 8].map((k) => ({ value: k, label: k === 1 ? "1 (sin paralelo)" : `${k} en paralelo` })),
            ]}
          />
        </Row>
        {spacedOk && (
          <Toggle
            label={spacedLabel}
            checked={inputs.spaced}
            onChange={(v) => set("spaced", v)}
          />
        )}
      </Card>

      <Card step={4} title="Ambiente y local">
        {buried ? (
          <Row>
            <NumberField label="Temp. del terreno" unit="°C" value={inputs.groundTemp} onChange={(v) => set("groundTemp", v)} />
            <SelectField
              label="Resistividad térmica"
              value={inputs.soilRho}
              onChange={(v) => set("soilRho", v)}
              options={FR_OPTIONS.map((o) => ({ value: o.rho, label: o.label }))}
            />
          </Row>
        ) : (
          <Row>
            <NumberField
              label="Temperatura ambiente"
              hint={isAC ? "(base AEA 40 °C)" : "(base 30 °C)"}
              unit="°C"
              value={inputs.ambientTemp}
              onChange={(v) => set("ambientTemp", v)}
            />
            <NumberField
              label="Radiación solar directa"
              hint="(+°C; 0 si está a la sombra)"
              unit="°C"
              value={inputs.solarDelta}
              onChange={(v) => set("solarDelta", v)}
            />
          </Row>
        )}
        {!buried && inputs.solarDelta === 0 && (isAC ? inputs.environment === "intemperie" : true) && (
          <p className="text-[11px] leading-snug text-muted">
            Si el cable queda expuesto al sol, sumá el incremento de temperatura por radiación (IEC 60364-5-52 remite a
            IEC 60287; valores habituales de +15 a +20 °C — verificar).
          </p>
        )}
        {isAC && (
          <Row>
            <SelectField
              label="Tipo de local"
              value={inputs.location}
              onChange={(v) => set("location", v)}
              options={[
                { value: "estandar", label: "Estándar (BD1)" },
                { value: "publica", label: "Pública concurrencia (BD2–4)" },
              ]}
            />
            <SelectField
              label="Ambiente"
              value={inputs.environment}
              onChange={(v) => set("environment", v)}
              options={[
                { value: "interior", label: "Interior" },
                { value: "intemperie", label: "Intemperie" },
              ]}
            />
          </Row>
        )}
      </Card>

      <Card step={5} title="Tipo de cable">
        <SelectField label="Aislación / norma" value={inputs.family} onChange={(v) => set("family", v)} options={familyOptions} />
        {isAC && (
          <Segmented
            label="Material del conductor"
            value={inputs.material}
            onChange={(v) => set("material", v)}
            options={[
              { value: "Cu", label: "Cobre" },
              { value: "Al", label: "Aluminio" },
            ]}
          />
        )}
      </Card>

      {isAC && (
        <Card step={6} title="Cortocircuito">
          <Row>
            <NumberField
              label="I″k máx en el tablero"
              hint="(0 = no verificar)"
              unit="kA"
              value={inputs.ikKa}
              onChange={(v) => set("ikKa", v)}
            />
            <NumberField label="Tiempo de despeje" unit="s" value={inputs.tScS} onChange={(v) => set("tScS", v)} />
          </Row>
        </Card>
      )}
    </div>
  );
}
