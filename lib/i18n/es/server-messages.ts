// Server and shared messages, keyed by their English text. "{name}" stands
// for a part that changes and is carried into the translation. Patterns are
// tried in order, so the general "{name}: {error}" comes last.
export const serverMessages: Record<string, string> = {
  // Browser and shared code
  "Copied to clipboard.": "Copiado al portapapeles.",
  "Clipboard unavailable. Please use a secure browser connection.":
    "El portapapeles no está disponible. Usa una conexión segura del navegador.",
  "Bluetooth connected. Tap a tag to check in or enroll a student.":
    "Bluetooth conectado. Acerca una tarjeta para registrar o inscribir a un estudiante.",
  "Bluetooth disconnected. Reconnect before the next student scans.":
    "Bluetooth desconectado. Vuelve a conectar antes del siguiente registro.",
  "Choose the Classroom scanner in your browser’s Bluetooth window.":
    "Elige el escáner Classroom en la ventana de Bluetooth del navegador.",
  "Could not connect. Turn on Bluetooth and try again.":
    "No se pudo conectar. Activa Bluetooth e inténtalo de nuevo.",
  "Reconnecting to your scanner…": "Reconectando con tu escáner…",
  "Scanner disconnected. Reconnecting automatically…":
    "Escáner desconectado. Reconectando automáticamente…",
  "Waiting for the scanner. It reconnects by itself once it is on and nearby.":
    "Esperando el escáner. Se reconecta solo cuando esté encendido y cerca.",
  "This device does not offer a Bluetooth LE connection.":
    "Este dispositivo no ofrece conexión Bluetooth LE.",
  "Invalid server response.": "Respuesta no válida del servidor.",
  "Laptop cannot reach attendance. Check guest Wi-Fi sign-in or the local server.":
    "La computadora no se conecta con la asistencia. Revisa el inicio de sesión del Wi-Fi o el servidor local.",
  "Scan confirmation interrupted. Keep the scanner nearby; tap again if its LED flashes.":
    "Se interrumpió la confirmación. Mantén el escáner cerca y vuelve a registrar si su luz parpadea.",
  "Scanner sequence conflict. Reconnect the scanner.":
    "Conflicto de secuencia del escáner. Vuelve a conectarlo.",
  "Unsupported scanner firmware. Upload ClassroomBluetooth first.":
    "El programa del escáner no es compatible. Primero instala ClassroomBluetooth.",
  "Invalid Bluetooth scan packet.": "Paquete de Bluetooth no válido.",
  "Invalid Bluetooth UID length.": "Longitud de UID de Bluetooth no válida.",
  "{student} checked in.": "{student} quedó registrado.",
  "{student} is already checked in.": "{student} ya estaba registrado.",
  "{student} present · pending sync.":
    "{student} presente · sincronización pendiente.",
  Student: "Estudiante",
  "Tag detected. Confirm the student’s tag in Students.":
    "Tarjeta detectada. Confirma la tarjeta del estudiante en Estudiantes.",
  "Unknown tag. Assign it to a student first.":
    "Tarjeta desconocida. Primero asígnala a un estudiante.",
  "Student is not enrolled in the scanner’s active class.":
    "El estudiante no está inscrito en la clase activa del escáner.",
  "Choose a class under Taking attendance for on Today, then tap again.":
    "Elige una clase para el escáner y vuelve a registrar.",
  "This scanner is disabled or is not part of your classroom.":
    "Este escáner está desactivado o no es de tu salón.",
  "Invalid scan. Check the scanner firmware and tap again.":
    "Registro no válido. Revisa el programa del escáner y vuelve a intentarlo.",
  "Scan not confirmed. Check the laptop’s connection, then tap again.":
    "Registro sin confirmar. Revisa la conexión de la computadora y vuelve a intentarlo.",
  "Scan not confirmed. Sign in again or check your connection.":
    "Registro sin confirmar. Vuelve a iniciar sesión o revisa tu conexión.",
  "Attendance is waiting for a connection.":
    "La asistencia está esperando una conexión.",
  "Local attendance storage is still opening. Try again.":
    "El almacenamiento local de asistencia todavía se está abriendo. Inténtalo de nuevo.",
  "Local attendance storage is unavailable. Changes cannot be queued in this browser.":
    "El almacenamiento local de asistencia no está disponible. Los cambios no se pueden poner en cola en este navegador.",
  "Local attendance storage is unavailable. This change was not queued.":
    "El almacenamiento local de asistencia no está disponible. Este cambio no se puso en cola.",
  "Resolve this student's sync conflict before changing attendance again.":
    "Resuelve el conflicto de sincronización de este estudiante antes de volver a cambiar su asistencia.",
  "Attendance confirmation did not match the queued change.":
    "La confirmación de asistencia no coincide con el cambio en cola.",
  "Attendance changed elsewhere. Review the latest status.":
    "La asistencia cambió en otro lugar. Revisa el estado más reciente.",
  "Attendance changed elsewhere. Review the latest status before retrying.":
    "La asistencia cambió en otro lugar. Revisa el estado más reciente antes de intentarlo de nuevo.",
  "Attendance changed elsewhere. Refresh the list and review the latest status before trying again.":
    "La asistencia cambió en otro lugar. Actualiza la lista y revisa el estado más reciente antes de intentarlo de nuevo.",
  "An earlier change conflicted with attendance saved elsewhere.":
    "Un cambio anterior chocó con asistencia guardada en otro lugar.",
  "Sign in again to sync attendance saved in this browser.":
    "Vuelve a iniciar sesión para sincronizar la asistencia guardada en este navegador.",
  "Could not reach attendance. Check the connection; this browser will retry automatically.":
    "No se pudo conectar con la asistencia. Revisa la conexión; este navegador lo intentará de nuevo automáticamente.",
  "Attendance storage was interrupted.":
    "Se interrumpió el almacenamiento de la asistencia.",
  "The banner could not be saved.": "No se pudo guardar el encabezado.",
  "This browser could not save the picture. Check its available storage.":
    "Este navegador no pudo guardar la imagen. Revisa el espacio disponible.",
  "Choose a JPG, PNG, or WebP picture.": "Elige una imagen JPG, PNG o WebP.",
  "Choose a picture up to 10 MB.": "Elige una imagen de hasta 10 MB.",
  "This picture could not be opened. Try another file.":
    "No se pudo abrir esta imagen. Prueba con otro archivo.",
  "This picture is too large. Choose one under 40 megapixels.":
    "Esta imagen es demasiado grande. Elige una de menos de 40 megapíxeles.",
  "This browser could not prepare the picture.":
    "Este navegador no pudo preparar la imagen.",
  "This picture could not be saved.": "No se pudo guardar esta imagen.",
  "Choose one of the built-in themes.": "Elige uno de los temas incluidos.",
  "Choose one of the banner colors.": "Elige uno de los colores de encabezado.",

  // Account and password checks
  "8–20 characters": "8 a 20 caracteres",
  "At least one uppercase letter": "Al menos una letra mayúscula",
  "At least one number": "Al menos un número",
  "at least one uppercase letter": "al menos una letra mayúscula",
  "at least one number": "al menos un número",
  "Password needs {rules}.": "A la contraseña le falta: {rules}.",
  "Enter a password.": "Escribe una contraseña.",
  "Enter a username.": "Escribe un nombre de usuario.",
  "Username must be 100 characters or fewer.":
    "El nombre de usuario debe tener 100 caracteres o menos.",
  "Enter a valid email address.": "Escribe un correo electrónico válido.",
  "Email or password is incorrect.":
    "El correo o la contraseña no son correctos.",
  "Please sign in.": "Inicia sesión.",
  "Please sign in again.": "Vuelve a iniciar sesión.",
  "Current password is incorrect.": "La contraseña actual no es correcta.",
  "Enter your current password.": "Escribe tu contraseña actual.",
  "Choose a valid password action.": "Elige una acción de contraseña válida.",
  "Could not update the password. Choose a different password and try again.":
    "No se pudo actualizar la contraseña. Elige otra contraseña e inténtalo de nuevo.",
  "This reset link has expired. Request a new one.":
    "Este enlace para restablecer ya venció. Pide uno nuevo.",
  "Password changes are unavailable in the local demo.":
    "En la demostración local no se puede cambiar la contraseña.",
  "Password reset is unavailable in the local demo.":
    "En la demostración local no se puede restablecer la contraseña.",
  "Please wait before requesting another reset email.":
    "Espera un poco antes de pedir otro correo para restablecer.",
  "Could not send a reset email right now. Please try again.":
    "No se pudo enviar el correo para restablecer ahora. Inténtalo de nuevo.",
  "Account creation is not enabled for this classroom yet.":
    "Todavía no se pueden crear cuentas en este salón.",
  "Account creation is unavailable in the local demo. Use Open demo classroom instead.":
    "En la demostración local no se pueden crear cuentas. Usa Abrir salón de demostración.",
  "Could not create the account. Please try again.":
    "No se pudo crear la cuenta. Inténtalo de nuevo.",
  "Google sign-in is not available. Check the provider setup and try again.":
    "El inicio de sesión con Google no está disponible. Revisa la configuración e inténtalo de nuevo.",
  "Google sign-in is unavailable in the local demo. Open the demo classroom instead.":
    "En la demostración local no se puede iniciar sesión con Google. Abre el salón de demostración.",
  "A public HTTPS origin is required for authentication.":
    "Para iniciar sesión se necesita un sitio HTTPS público.",
  "Invalid public request origin.": "Origen de la solicitud no válido.",
  "Request origin is not allowed.":
    "El origen de la solicitud no está permitido.",

  // General server responses
  "Check the form fields and try again.":
    "Revisa los campos del formulario e inténtalo de nuevo.",
  "The change conflicts with an existing record, membership, or tag. Refresh and try again.":
    "El cambio choca con un registro, una inscripción o una tarjeta existente. Actualiza e inténtalo de nuevo.",
  "Send a valid JSON request.": "Envía una solicitud JSON válida.",
  "The server could not save this request. Please retry.":
    "El servidor no pudo guardar esta solicitud. Inténtalo de nuevo.",
  "Supabase is not configured.": "Supabase no está configurado.",
  "Supabase is not configured. Follow the README setup steps.":
    "Supabase no está configurado. Sigue los pasos de instalación del README.",
  "Simulator unavailable.": "El simulador no está disponible.",

  // Classes, students and attendance
  "Class not found.": "No se encontró la clase.",
  "Class is unavailable.": "La clase no está disponible.",
  "Class is archived or unavailable.":
    "La clase está archivada o no está disponible.",
  "Period not found.": "No se encontró el período.",
  "Student not found.": "No se encontró al estudiante.",
  "Scanner not found.": "No se encontró el escáner.",
  "Activity set not found.": "No se encontró el conjunto de actividades.",
  "Another active class uses this period number.":
    "Otra clase activa usa este número de período.",
  "Another active class uses this period. Edit the archived class before restoring it.":
    "Otra clase activa usa este período. Edita la clase archivada antes de restaurarla.",
  "Archived classes can only edit existing attendance history.":
    "En las clases archivadas solo se puede editar el historial existente.",
  "Restore this class before changing its roster.":
    "Restaura esta clase antes de cambiar su lista.",
  "Restore this class before importing its roster.":
    "Restaura esta clase antes de importar su lista.",
  "Use Manage classes to archive or restore a class.":
    "Usa Administrar clases para archivar o restaurar una clase.",
  "Use Weekly schedule to change school times.":
    "Usa el horario semanal para cambiar los horarios escolares.",
  "End time must be after start time.":
    "La hora de fin debe ser después de la hora de inicio.",
  "Set a bell time for this period in Settings first.":
    "Primero agrega un horario de timbre para este período en Configuración.",
  "Choose an active class for scanner taps.":
    "Elige una clase activa para los registros del escáner.",
  "Choose classes from your own classroom.": "Elige clases de tu propio salón.",
  "Choose one of your own classes.": "Elige una de tus clases.",
  "Select each student only once.":
    "Selecciona a cada estudiante una sola vez.",
  "Student is not enrolled in this class.":
    "El estudiante no está inscrito en esta clase.",
  "Student is not enrolled in this period.":
    "El estudiante no está inscrito en este período.",
  "This School ID already belongs to another student.":
    "Este ID escolar ya es de otro estudiante.",
  "Enter a six-digit School ID for the new student.":
    "Escribe un ID escolar de seis dígitos para el nuevo estudiante.",
  "Enter a six-digit School ID (for example, 123456).":
    "Escribe un ID escolar de seis dígitos (por ejemplo, 123456).",
  "Could not save this student. Refresh and try again.":
    "No se pudo guardar este estudiante. Actualiza e inténtalo de nuevo.",
  "This tag is already assigned to another student.":
    "Esta tarjeta ya está asignada a otro estudiante.",
  "Tag is no longer active.": "La tarjeta ya no está activa.",
  "Turn on this scanner before adding a card.":
    "Activa este escáner antes de agregar una tarjeta.",
  "Scanner or tag is no longer active.":
    "El escáner o la tarjeta ya no están activos.",
  "UID must contain 4, 7, or 10 hexadecimal bytes.":
    "El UID debe tener 4, 7 o 10 bytes hexadecimales.",
  "Type the confirmation phrase exactly.":
    "Escribe la frase de confirmación exactamente.",
  "Undo needs the expected attendance record.":
    "Para deshacer se necesita el registro de asistencia esperado.",
  "Configure real scanners after connecting Supabase. The local demo scanner is already available.":
    "Configura escáneres reales después de conectar Supabase. El escáner de la demostración ya está disponible.",
  "A scanner tap needs an active device, tag, and present status.":
    "Un registro del escáner necesita un dispositivo activo, una tarjeta y el estado presente.",
  "Restored attendance needs a matching status and check-in time.":
    "La asistencia restaurada necesita un estado y una hora de registro que coincidan.",
  "Only a note change carries a note.":
    "Solo un cambio de nota lleva una nota.",
  "Invalid attendance operation": "Operación de asistencia no válida",
  "Enter a positive whole number.": "Escribe un número entero positivo.",

  // Schedules
  "Schedule changed elsewhere. Reload and try again.":
    "El horario cambió en otro lugar. Recarga e inténtalo de nuevo.",
  "Save at most 20 schedule presets.": "Guarda como máximo 20 horarios.",
  "Each schedule needs a name of 1–60 characters.":
    "Cada horario necesita un nombre de 1 a 60 caracteres.",
  "A schedule ID appears more than once.":
    "Un ID de horario aparece más de una vez.",
  "Assign schedules only to Monday through Friday.":
    "Asigna horarios solo de lunes a viernes.",
  "A schedule named {name} already exists.":
    "Ya existe un horario llamado {name}.",
  "{name} needs a list of periods.": "{name} necesita una lista de períodos.",
  "{day} refers to a missing schedule.": "{day} usa un horario que no existe.",
  "Periods {first} and {second} overlap.":
    "Los períodos {first} y {second} se superponen.",
  "Periods must be numbered from 1 to 20.":
    "Los períodos deben estar numerados del 1 al 20.",
  "Period {number} appears more than once.":
    "El período {number} aparece más de una vez.",
  "Period {number} needs a valid start and end time.":
    "El período {number} necesita una hora de inicio y de fin válidas.",
  "Choose a valid time zone.": "Elige una zona horaria válida.",
  "Enter a class name (up to 100 characters).":
    "Escribe el nombre de la clase (hasta 100 caracteres).",
  "Choose a period from 1 to 20.": "Elige un período del 1 al 20.",
  "Enter a start and end time, with the end after the start.":
    "Escribe una hora de inicio y de fin, con el fin después del inicio.",
  "Choose at least one weekday for this class.":
    "Elige al menos un día de la semana para esta clase.",

  // Roster and activity imports
  "Enter at least one student.": "Escribe al menos un estudiante.",
  "Import at most 500 students at a time.":
    "Importa como máximo 500 estudiantes a la vez.",
  "A quoted cell is not closed. Check the file and try again.":
    "Una celda con comillas no está cerrada. Revisa el archivo e inténtalo de nuevo.",
  "Map the file columns before previewing the roster.":
    "Asigna las columnas del archivo antes de ver la lista.",
  "Roster changed. Refresh and preview again.":
    "La lista cambió. Actualiza y vuelve a ver la vista previa.",
  "A student or Student Number already exists. Refresh and review the matches.":
    "Ya existe un estudiante o un número de estudiante. Actualiza y revisa las coincidencias.",
  "Row {line}: enter a first and last name.":
    "Fila {line}: escribe nombre y apellido.",
  "Row {line}: names must be 100 characters or less.":
    "Fila {line}: los nombres deben tener 100 caracteres o menos.",
  "Row {line}: enter a six-digit Student Number.":
    "Fila {line}: escribe un número de estudiante de seis dígitos.",
  "Row {line}: School email does not match the Student Number.":
    "Fila {line}: el correo escolar no coincide con el número de estudiante.",
  "Row {line}: Student Number is invalid.":
    "Fila {line}: el número de estudiante no es válido.",
  "Row {line}: Student Number appears more than once.":
    "Fila {line}: el número de estudiante aparece más de una vez.",
  "Row {line}: Student Number belongs to {name}. Choose that student.":
    "Fila {line}: el número de estudiante es de {name}. Elige a ese estudiante.",
  "Row {line}: School email is invalid.":
    "Fila {line}: el correo escolar no es válido.",
  "Row {line}: School email appears more than once.":
    "Fila {line}: el correo escolar aparece más de una vez.",
  "Row {line}: School email belongs to {name}. Choose that student.":
    "Fila {line}: el correo escolar es de {name}. Elige a ese estudiante.",
  "Row {line}: the same student is listed more than once.":
    "Fila {line}: el mismo estudiante aparece más de una vez.",
  "Row {line}: the selected existing student is unavailable.":
    "Fila {line}: el estudiante existente elegido no está disponible.",
  "Row {line}: this student's saved Student Number is different.":
    "Fila {line}: el número guardado de este estudiante es distinto.",
  "Row {line}: this student's saved school email is different.":
    "Fila {line}: el correo escolar guardado de este estudiante es distinto.",
  "Add some word pairs to import.":
    "Agrega algunos pares de palabras para importar.",
  "Add some word pairs below the headers.":
    "Agrega algunos pares de palabras debajo de los títulos.",
  "Add some sentences to import.": "Agrega algunas oraciones para importar.",
  "Add some sentences below the headers.":
    "Agrega algunas oraciones debajo de los títulos.",
  "Import up to 1 MB of text at a time.":
    "Importa hasta 1 MB de texto a la vez.",
  "Import up to 100 pairs at a time.": "Importa hasta 100 pares a la vez.",
  "Import up to 100 sentences at a time.":
    "Importa hasta 100 oraciones a la vez.",
  "Row {row} has more than two columns. Put phrases containing commas in quotes.":
    "La fila {row} tiene más de dos columnas. Pon entre comillas las frases con comas.",
  "Row {row} has more than two columns. Put sentences containing commas in quotes.":
    "La fila {row} tiene más de dos columnas. Pon entre comillas las oraciones con comas.",
  "Row {row} is longer than 500 characters.":
    "La fila {row} tiene más de 500 caracteres.",
  "Add a meaning for each vocabulary word.":
    "Agrega un significado para cada palabra de vocabulario.",
  "Alternative answers must use the same words as the saved sentence.":
    "Las respuestas alternativas deben usar las mismas palabras que la oración guardada.",
  "Each item must have its own ID.": "Cada elemento debe tener su propio ID.",

  // Migrations and setup (shown to the person running the site)
  "Activity sets need database migration 013 before they can be saved.":
    "Los conjuntos de actividades necesitan la migración 013 de la base de datos.",
  "Attendance notes need database migration 016 in Supabase.":
    "Las notas de asistencia necesitan la migración 016 en Supabase.",
  "Attendance sync needs migration 010 in Supabase.":
    "La sincronización de asistencia necesita la migración 010 en Supabase.",
  "Class archiving needs database migration 004. Ask the project owner to apply it first.":
    "Archivar clases necesita la migración 004. Pide a quien administra el proyecto que la aplique.",
  "Class ordering needs database migration 005 before it can be saved.":
    "Ordenar clases necesita la migración 005 de la base de datos.",
  "First-run setup needs migration 009 in Supabase.":
    "La configuración inicial necesita la migración 009 en Supabase.",
  "Roster import needs database migration 007. Ask the project owner to apply it first.":
    "Importar listas necesita la migración 007. Pide a quien administra el proyecto que la aplique.",
  "School schedule needs database migration 003 before it can be saved.":
    "El horario escolar necesita la migración 003 de la base de datos.",
  "Weekly schedule needs database migration 008 before it can be saved.":
    "El horario semanal necesita la migración 008 de la base de datos.",
  "Weekly schedule needs database migration 008. Ask the project owner to apply it first.":
    "El horario semanal necesita la migración 008. Pide a quien administra el proyecto que la aplique.",
  "Synced banners need database migration 014. Ask the project owner to apply it.":
    "Sincronizar encabezados necesita la migración 014. Pide a quien administra el proyecto que la aplique.",
  "Banners are saved in this browser in the demo.":
    "En la demostración, los encabezados se guardan en este navegador.",
  "The photo could not be saved. Check that migration 014 created the class-banners bucket.":
    "No se pudo guardar la foto. Revisa que la migración 014 haya creado el depósito class-banners.",
  "This picture is too large to sync.":
    "Esta imagen es demasiado grande para sincronizarla.",
  "This class has no photo.": "Esta clase no tiene foto.",

  // QR check-in (students)
  "QR check-in requires a hosted teacher account.":
    "El registro con QR necesita una cuenta de maestro en línea.",
  "QR check-in needs QR_CHECKIN_SECRET set on the server before it can be shown.":
    "El registro con QR necesita QR_CHECKIN_SECRET en el servidor antes de mostrarse.",
  "QR check-in needs database migration 011 before it can save attendance.":
    "El registro con QR necesita la migración 011 para guardar asistencia.",
  "QR check-in is not configured.": "El registro con QR no está configurado.",
  "Student check-in is not configured yet.":
    "El registro de estudiantes todavía no está configurado.",
  "Enter your six-digit student ID (for example, 123456).":
    "Escribe tu ID de estudiante de seis dígitos (por ejemplo, 123456).",
  "This QR code is invalid. Scan the code shown by your teacher.":
    "Este código QR no es válido. Escanea el código que muestra tu maestro.",
  "This check-in page timed out. Scan the code on the board again.":
    "Se acabó el tiempo de esta página. Escanea de nuevo el código de la pantalla.",
  "This class is no longer available.": "Esta clase ya no está disponible.",
  "This QR code is from another day. Scan today's code.":
    "Este código QR es de otro día. Escanea el código de hoy.",
  "Check-in opens only during this class's scheduled time.":
    "El registro solo está abierto durante el horario de esta clase.",
  "Check-in has closed for this class. Ask your teacher for help.":
    "El registro de esta clase ya cerró. Pide ayuda a tu maestro.",
  "Google check-in is not set up.":
    "El registro con Google no está configurado.",
  "Google could not verify this account. Sign in with your school account and try again.":
    "Google no pudo verificar esta cuenta. Inicia sesión con tu cuenta escolar e inténtalo de nuevo.",
  "Use your school's Google account to check in.":
    "Usa tu cuenta escolar de Google para registrarte.",
  "This school account is not linked to a student in this class. Ask your teacher to add your school email.":
    "Esta cuenta escolar no está vinculada a un estudiante de esta clase. Pide a tu maestro que agregue tu correo escolar.",
  "That ID isn’t on this class’s roster. Check the number, or ask your teacher.":
    "Ese ID no está en la lista de esta clase. Revisa el número o pregunta a tu maestro.",
  "This phone already checked in a student to this class today. Each student checks in on their own phone.":
    "Este teléfono ya registró a un estudiante en esta clase hoy. Cada estudiante se registra en su propio teléfono.",

  // Last: general patterns
  "{name}: {error}": "{name}: {error}",
};
