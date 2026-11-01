import type { HelpTranslation } from "./types";

// Spanish Help Center. Button and page names match the Spanish interface.
export const helpEs: HelpTranslation = {
  categories: {
    "getting-started": "Primeros pasos",
    attendance: "Asistencia",
    students: "Estudiantes",
    schedules: "Horarios",
    activities: "Actividades de clase",
    troubleshooting: "Solución de problemas",
    settings: "Configuración general",
  },
  articles: {
    "start-dashboard": {
      title: "¿Por dónde empiezo?",
      description: "Encuentra tus clases y las herramientas principales.",
      keywords: ["maestro nuevo", "inicio", "primera vez", "panel"],
      steps: [
        "Abre Inicio para ver la clase en curso y tus clases de hoy.",
        "Elige una clase de la lista para abrir su página de asistencia.",
        "Usa la barra lateral para Actividades, Historial, Administrar clases y Ajustes.",
      ],
      routeLabel: "Ir a Inicio",
    },
    "start-class": {
      title: "¿Cómo configuro mi primera clase?",
      description: "Crea una clase y encuéntrala en Inicio.",
      keywords: ["maestro nuevo", "primera clase", "crear clase"],
      steps: [
        "Elige Agregar clase en Inicio.",
        "Escribe el nombre de la clase y el período, y guárdala.",
        "Elígela en Inicio para abrir su lista y su página de asistencia.",
      ],
      routeLabel: "Ir a Inicio",
    },
    "start-roster": {
      title: "¿Cómo preparo la lista de una clase?",
      description: "Agrega estudiantes uno por uno o importa una lista.",
      keywords: ["maestro nuevo", "lista", "inscribir estudiantes"],
      steps: [
        "Abre una clase y elige Agregar estudiante para escribir un estudiante.",
        "Para una lista, abre Administrar clases, edita la clase y elige Importar lista.",
        "Revisa la vista previa de la importación antes de confirmar los cambios.",
      ],
      routeLabel: "Ir a Administrar clases",
    },
    "start-attendance": {
      title: "¿Cómo marco la asistencia por primera vez?",
      description: "Usa el control de Estado en la lista de una clase.",
      keywords: ["maestro nuevo", "primera asistencia", "registro"],
      steps: [
        "Abre una clase desde Inicio.",
        "Busca a un estudiante en la tabla de asistencia y toca Presente, Ausente, Tarde o Justificado en su fila.",
        "Sincronización pendiente significa que el cambio ya se ve en tu navegador mientras espera la confirmación del servidor.",
      ],
      routeLabel: "Elegir una clase",
    },
    "start-activities": {
      title: "¿Qué puedo hacer en Actividades de clase?",
      description:
        "Elige estudiantes, forma grupos y usa conjuntos de práctica guardados.",
      keywords: ["maestro nuevo", "actividades", "juegos"],
      steps: [
        "Abre Actividades en la barra lateral y elige una clase.",
        "Usa Elegir estudiante o Formar grupos con los estudiantes marcados presentes.",
        "Usa Temas de conversación, Ordenar oraciones o Emparejar vocabulario con un conjunto de actividades.",
      ],
      routeLabel: "Ir a Actividades",
    },
    "start-settings": {
      title: "¿Dónde cambio mi configuración?",
      description:
        "Encuentra las opciones de cuenta, horario, apariencia y sonido.",
      keywords: ["maestro nuevo", "preferencias", "configuración"],
      steps: [
        "Abre Ajustes en la barra lateral y elige Configuración.",
        "Elige la pestaña Apariencia, Asistencia, Cuenta y jornada escolar o Datos de estudiantes.",
        "Haz el cambio en esa sección y usa su botón de guardar cuando aparezca.",
      ],
      routeLabel: "Ir a Configuración",
    },
    "take-attendance": {
      title: "¿Cómo tomo asistencia?",
      description:
        "Marca a los estudiantes como presentes, tarde, ausentes o justificados.",
      keywords: [
        "registro",
        "pasar lista",
        "marcar estudiante",
        "asistencia manual",
      ],
      steps: [
        "Abre una clase desde Inicio o el menú Clases.",
        "Busca a un estudiante en la tabla de asistencia o usa Buscar un estudiante.",
        "Elige su estado en el control de Estado. Los cambios se guardan automáticamente.",
      ],
      routeLabel: "Elegir una clase",
    },
    "bulk-attendance": {
      title: "¿Cómo marco a varios estudiantes a la vez?",
      description: "Aplica el mismo estado a un grupo de estudiantes.",
      keywords: ["varios", "en lote", "grupo", "asistencia en grupo"],
      steps: [
        "Abre la clase y elige Seleccionar varios arriba de la tabla de asistencia.",
        "Selecciona los estudiantes que quieres cambiar.",
        "Elige un estado para los seleccionados y aplica el cambio.",
      ],
      routeLabel: "Elegir una clase",
    },
    "view-history": {
      title: "¿Cómo veo la asistencia anterior?",
      description: "Revisa la asistencia guardada de una clase y una fecha.",
      keywords: [
        "historial",
        "día anterior",
        "registros pasados",
        "calendario",
      ],
      steps: [
        "Abre Historial en la barra lateral.",
        "Elige la clase arriba de la página.",
        "Selecciona una fecha en el calendario para ver su resumen y los registros de los estudiantes.",
      ],
      routeLabel: "Ir a Historial",
    },
    "correct-attendance": {
      title: "¿Cómo corrijo un registro de asistencia anterior?",
      description:
        "Actualiza un día guardado cuando un registro necesita corrección.",
      keywords: ["corregir", "editar historial", "cambiar asistencia", "error"],
      steps: [
        "Abre Historial, elige una clase y selecciona la fecha que quieres corregir.",
        "Elige Corregir este día arriba de la tabla de asistencia.",
        "Cambia el estado del estudiante y elige Terminar corrección al acabar.",
      ],
      routeLabel: "Ir a Historial",
    },
    "add-student": {
      title: "¿Cómo agrego un estudiante?",
      description: "Agrega un estudiante a la lista de una clase.",
      keywords: ["estudiante nuevo", "inscribir", "crear estudiante", "lista"],
      steps: [
        "Abre la clase del estudiante desde Inicio o el menú Clases.",
        "Elige Agregar estudiante arriba de la tabla de asistencia.",
        "Escribe los datos del estudiante en la ventana y guárdalos.",
      ],
      routeLabel: "Elegir una clase",
    },
    "edit-student": {
      title: "¿Cómo edito los datos de un estudiante?",
      description: "Actualiza a un estudiante que ya está en una clase.",
      keywords: [
        "cambiar nombre",
        "número de estudiante",
        "id escolar",
        "tarjeta",
      ],
      steps: [
        "Abre la clase del estudiante y busca su fila en la tabla de asistencia.",
        "Elige Editar en esa fila.",
        "Actualiza los datos en la ventana y guárdalos.",
      ],
      routeLabel: "Elegir una clase",
    },
    "import-roster": {
      title: "¿Cómo agrego o importo estudiantes desde una lista?",
      description:
        "Pega una lista o sube un archivo CSV para agregar muchos estudiantes.",
      keywords: [
        "hoja de cálculo",
        "csv",
        "pegar nombres",
        "subir lista",
        "sincronizar lista",
        "id de estudiantes",
      ],
      steps: [
        "Abre Administrar clases desde el menú Clases.",
        "Edita la clase y elige Importar lista. Para una clase nueva, usa Guardar e importar lista.",
        "Elige Pegar nombres o Subir CSV, revisa la vista previa y confirma los cambios.",
      ],
      routeLabel: "Ir a Administrar clases",
      tip: "Incluye el número de estudiante de seis dígitos de cada uno cuando lo tengas. Revisa los cambios antes de confirmar una lista sincronizada.",
    },
    "manage-classes": {
      title: "¿Cómo agrego o edito una clase?",
      description: "Crea una clase o cambia su nombre y período.",
      keywords: ["clase nueva", "período", "curso", "salón"],
      steps: [
        "Elige Agregar clase en Inicio para crear una clase.",
        "Para cambiar una clase, abre Administrar clases desde el menú Clases y elige Editar.",
        "Escribe los datos de la clase y elige Guardar clase.",
      ],
      routeLabel: "Ir a Administrar clases",
    },
    "weekly-schedule": {
      title: "¿Cómo cambio mi horario semanal?",
      description: "Elige el horario de timbres de cada día de la semana.",
      keywords: [
        "horas",
        "día",
        "lunes",
        "horario de timbres",
        "hora del período",
      ],
      steps: [
        "Abre Ajustes y luego Configuración.",
        "Elige Cuenta y jornada escolar y abre Editar horario semanal.",
        "Edita o crea un horario, asígnalo a los días y elige Guardar horario semanal.",
      ],
      routeLabel: "Ir a Configuración",
      tip: "Un día sin horario asignado pausa el destino automático del escáner.",
    },
    "archive-class": {
      title: "¿Cómo archivo o restauro una clase?",
      description:
        "Saca una clase que no usas de la navegación sin perder su historial.",
      keywords: ["quitar clase", "recuperar clase", "inactiva", "restaurar"],
      steps: [
        "Abre Administrar clases desde el menú Clases.",
        "Usa Archivar en una clase activa y confirma Archivar clase.",
        "Para recuperarla, búscala en Clases archivadas y elige Restaurar.",
      ],
      routeLabel: "Ir a Administrar clases",
    },
    wheel: {
      title: "¿Cómo elijo a un estudiante al azar?",
      description: "Usa la ruleta para elegir entre los estudiantes presentes.",
      keywords: ["estudiante al azar", "ruleta", "girar", "elegir nombre"],
      steps: [
        "Marca a los estudiantes presentes en su clase.",
        "Abre Actividades, elige la clase y selecciona Elegir estudiante.",
        "Elige Elegir un estudiante o el botón del dado en el centro de la ruleta.",
        "Cierra la ventana del estudiante elegido. Elige Reiniciar para incluir a todos de nuevo.",
      ],
      routeLabel: "Ir a Elegir estudiante",
    },
    groups: {
      title: "¿Cómo formo grupos al azar?",
      description:
        "Divide a los estudiantes presentes por número de grupos o por estudiantes por grupo.",
      keywords: ["grupos al azar", "equipos", "grupos de cuatro", "mezclar"],
      steps: [
        "Marca a los estudiantes presentes, abre Actividades y elige la clase.",
        "Selecciona Formar grupos y elige Número de grupos o Estudiantes por grupo en Agrupar por.",
        "Escribe la cantidad y elige Formar grupos. Usa Mezclar de nuevo para otra combinación.",
      ],
      routeLabel: "Ir a Formar grupos",
    },
    "activity-sets": {
      title: "¿Cómo creo y guardo un conjunto de actividades?",
      description:
        "Guarda temas, oraciones o vocabulario para las actividades de clase.",
      keywords: [
        "guardar actividades",
        "conjunto nuevo",
        "biblioteca",
        "vocabulario",
        "temas",
      ],
      steps: [
        "Abre Actividades y elige Temas de conversación, Ordenar oraciones o Emparejar vocabulario.",
        "En Conjuntos de actividades, elige Nuevo conjunto.",
        "Escribe un nombre para el conjunto y sus elementos, y guárdalo.",
      ],
      routeLabel: "Ir a Temas de conversación",
      tip: "La actividad que elegiste define el tipo de contenido del conjunto.",
    },
    "import-activity-items": {
      title: "¿Cómo importo palabras, temas u oraciones?",
      description: "Llena un conjunto con texto pegado o un archivo.",
      keywords: ["csv", "pegar", "subir", "lista de vocabulario", "oraciones"],
      steps: [
        "Abre la actividad y elige Nuevo conjunto o edita uno existente.",
        "En el editor, elige Importar palabras, Importar temas o Importar oraciones.",
        "Revisa la vista previa, aplica la importación y guarda el conjunto.",
      ],
      routeLabel: "Ir a Temas de conversación",
    },
    conversation: {
      title: "¿Cómo uso los temas de conversación?",
      description: "Muestra una pregunta guardada para conversar en clase.",
      keywords: ["hablar", "preguntas", "conversación", "tema en español"],
      steps: [
        "Abre Actividades y elige Temas de conversación.",
        "Elige la clase y selecciona un conjunto en Conjuntos de actividades, o crea uno nuevo.",
        "Usa los botones de la actividad para mostrar otra pregunta.",
      ],
      routeLabel: "Ir a Temas de conversación",
    },
    scramble: {
      title: "¿Cómo uso Ordenar oraciones?",
      description: "Practica poner las palabras en el orden correcto.",
      keywords: ["ordenar palabras", "orden de palabras", "juego de oraciones"],
      steps: [
        "Abre Actividades y elige Ordenar oraciones.",
        "Elige un conjunto guardado en Conjuntos de actividades o crea uno con oraciones correctas en español.",
        "Selecciona las palabras en orden y usa Comprobar respuesta.",
      ],
      routeLabel: "Ir a Ordenar oraciones",
    },
    matching: {
      title: "¿Cómo uso Emparejar vocabulario?",
      description: "Une las palabras guardadas con su significado.",
      keywords: ["unir", "conectar", "traducción", "significado", "pareja"],
      steps: [
        "Abre Actividades y elige Emparejar vocabulario.",
        "Elige o crea un conjunto de vocabulario en Conjuntos de actividades.",
        "Selecciona una palabra y luego su significado. Cada pareja aparece unida con una línea de color.",
      ],
      routeLabel: "Ir a Emparejar vocabulario",
    },
    scanner: {
      title: "¿Cómo conecto el escáner del salón?",
      description: "Conecta el escáner Bluetooth para registrar con tarjetas.",
      keywords: ["bluetooth", "rfid", "tarjeta", "escanear", "registro"],
      steps: [
        "Toca el botón redondo de Bluetooth abajo a la derecha de Inicio o de cualquier clase.",
        "Selecciona el escáner Bluetooth del salón cuando el navegador te pida un dispositivo.",
        "Mantén la pestaña abierta mientras los estudiantes acercan sus tarjetas. Después de la primera vez, Chrome y Edge se reconectan solos al escáner.",
      ],
      routeLabel: "Ir a Escáner",
    },
    appearance: {
      title: "¿Cómo cambio la apariencia?",
      description:
        "Elige claro u oscuro, activa o desactiva los efectos de sonido y cambia el encabezado de cada clase.",
      keywords: [
        "claro",
        "oscuro",
        "color",
        "personalizar",
        "encabezado",
        "tema",
        "sonido",
      ],
      steps: [
        "Abre Ajustes y luego Configuración.",
        "En Apariencia, elige Claro, Oscuro o Sistema. Ahí también se activan o desactivan los efectos de sonido.",
        "Para cambiar el encabezado de una clase, ábrela, elige el botón ⋯ de su encabezado y luego Personalizar: elige un tema, un color o sube tu propia foto.",
      ],
      routeLabel: "Ir a Configuración",
    },
    language: {
      title: "¿Cómo cambio el idioma?",
      description: "Usa Class Connect en inglés o en español.",
      keywords: ["español", "inglés", "idioma", "traducir", "language"],
      steps: [
        "Abre Ajustes y luego Configuración.",
        "En Apariencia, elige un idioma en Idioma.",
        "La página cambia de inmediato. Tu elección se guarda en este navegador.",
      ],
      routeLabel: "Ir a Configuración",
      tip: "Los estudiantes ven la página de registro en el idioma de su teléfono y pueden cambiarlo arriba de la página.",
    },
    account: {
      title: "¿Cómo actualizo mi cuenta?",
      description: "Cambia tu nombre o tu contraseña.",
      keywords: [
        "nombre de usuario",
        "nombre del maestro",
        "restablecer contraseña",
        "correo",
      ],
      steps: [
        "Abre Ajustes y luego Configuración.",
        "Elige Cuenta y jornada escolar y busca la sección Cuenta.",
        "Ahí puedes cambiar tu nombre, tu contraseña o pedir un correo para restablecerla.",
      ],
      routeLabel: "Ir a Configuración",
    },
    "missing-from-wheel": {
      title: "¿Por qué un estudiante no aparece en la ruleta?",
      description:
        "La ruleta usa a los estudiantes marcados presentes en la clase elegida.",
      keywords: ["falta en la ruleta", "no aparece", "ya salió"],
      steps: [
        "Revisa que la clase correcta esté elegida en Actividades.",
        "Abre esa clase, marca al estudiante como Presente y vuelve a Elegir estudiante.",
        "Si el estudiante ya salió, elige Reiniciar para incluir de nuevo a todos los presentes.",
      ],
      routeLabel: "Ir a Elegir estudiante",
    },
    "csv-trouble": {
      title: "¿Por qué no se importa mi lista de estudiantes?",
      description:
        "Revisa el tipo de archivo, la asignación de columnas y los errores de la vista previa.",
      keywords: [
        "error csv",
        "falla al importar",
        "archivo",
        "hoja de cálculo",
      ],
      steps: [
        "En Administrar clases, edita la clase y abre Importar lista.",
        "Elige Subir CSV para un archivo CSV o Pegar nombres para texto copiado.",
        "Revisa las columnas detectadas y las filas no válidas o repetidas. Corrige el archivo o la asignación y vuelve a ver la vista previa antes de confirmar.",
      ],
      routeLabel: "Ir a Administrar clases",
    },
    "roster-search": {
      title: "¿Por qué no encuentro a un estudiante?",
      description: "Revisa la clase y busca en la lista de asistencia.",
      keywords: [
        "falta en la lista",
        "no encuentro estudiante",
        "clase equivocada",
      ],
      steps: [
        "Elige la clase del estudiante desde Inicio o el menú Clases.",
        "Usa Buscar un estudiante arriba de la tabla de asistencia.",
        "Si no está en esa clase, agrégalo con Agregar estudiante o revisa la lista importada.",
      ],
      routeLabel: "Elegir una clase",
    },
    "attendance-sync": {
      title: "¿Por qué dice Sincronización pendiente?",
      description: "Un cambio local espera la confirmación del servidor.",
      keywords: ["no se guardó", "sin conexión", "lento", "sincronizar", "red"],
      steps: [
        "Revisa que el navegador tenga conexión a internet.",
        "Mantén la página abierta mientras se sincroniza el cambio pendiente.",
        "Si la fila muestra un conflicto, revisa el estado del estudiante antes de usar Descartar el cambio en cola y recargar.",
      ],
      routeLabel: "Elegir una clase",
      tip: "Sincronización pendiente significa que el cambio se ve en tu navegador pero el servidor todavía no lo confirmó.",
    },
    "forgotten-card": {
      title: "¿Qué hago si un estudiante olvida su tarjeta?",
      description: "Puedes marcar la asistencia desde la lista de la clase.",
      keywords: ["tarjeta perdida", "sin tarjeta", "olvidó la tarjeta", "rfid"],
      steps: [
        "Abre la clase del estudiante.",
        "Búscalo en la tabla de asistencia y toca Presente en su fila.",
        "Más tarde, usa Editar en su fila si hay que actualizar los datos de su tarjeta.",
      ],
      routeLabel: "Elegir una clase",
    },
    "missing-activity-set": {
      title: "¿Por qué no aparece mi conjunto de actividades?",
      description: "Cada actividad muestra su propio tipo de conjuntos.",
      keywords: [
        "falta conjunto",
        "no aparece la actividad",
        "actividad equivocada",
      ],
      steps: [
        "Abre la actividad donde creaste el conjunto: Temas de conversación, Ordenar oraciones o Emparejar vocabulario.",
        "Busca su nombre en Conjuntos de actividades. Los conjuntos de otras actividades no aparecen ahí.",
        "Si todavía no aparece, confirma que lo guardaste en el editor.",
      ],
      routeLabel: "Ir a Temas de conversación",
    },
  },
};
