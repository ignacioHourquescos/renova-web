# Reglas de Firestore

El archivo `firestore.rules` contiene reglas de seguridad para tu base Firestore.

## Cómo aplicarlas

### Opción 1: Copiar en la consola de Firebase (recomendado)

1. Abrí [Firebase Console](https://console.firebase.google.com) → tu proyecto **renova errores 2**.
2. Entrá a **Firestore Database** → pestaña **Rules**.
3. Reemplazá todo el contenido del editor por el contenido de `firestore.rules`.
4. Clic en **Publicar** / **Publish**.

### Opción 2: Firebase CLI

Si tenés Firebase CLI y el proyecto vinculado:

```bash
firebase deploy --only firestore:rules
```

(Requiere tener `firebase.json` con la sección `firestore` apuntando a `firestore.rules`.)

## Qué hacen estas reglas

- **ingreso_a_listas** y **visitas_web**: desde la web solo se puede **crear** documentos. No se puede leer, actualizar ni borrar desde el cliente.
- **Resto de colecciones**: acceso denegado desde el cliente (solo backend/admin si lo usás).
