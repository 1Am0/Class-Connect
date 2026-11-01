import type en from "../en/pickers";
import type { Translation } from "../translate";

export default {
  date: "Fecha",
  chooseLabel: "Elegir {label}",
  previousMonth: "Mes anterior",
  nextMonth: "Mes siguiente",
  arrowHint: "Usa las flechas para moverte por días",
  pickTime: "Elegir la hora: {label}",
  openTimePicker: "Abrir selector de hora",
  hour: "Hora",
  minute: "Minuto",
  meridiem: "a. m. / p. m.",
  hourLabel: "{label}: hora",
  minuteLabel: "{label}: minuto",
  meridiemLabel: "{label}: a. m. o p. m.",
  am: "a. m.",
  pm: "p. m.",
  cancel: "Cancelar",
  apply: "Aplicar hora",
} satisfies Translation<typeof en>;
