const maxImageBytes = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function bannerPhotoError(file: Pick<File, "type" | "size">) {
  if (!allowedTypes.has(file.type))
    return "Choose a JPG, PNG, or WebP picture.";
  if (!file.size || file.size > maxImageBytes)
    return "Choose a picture up to 10 MB.";
  return null;
}

export async function prepareBannerPhoto(
  file: File,
  maxSide = 2400,
): Promise<Blob> {
  const error = bannerPhotoError(file);
  if (error) throw new Error(error);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This picture could not be opened. Try another file.");
  }
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 40_000_000
    )
      throw new Error(
        "This picture is too large. Choose one under 40 megapixels.",
      );
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("This browser could not prepare the picture.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("This picture could not be saved.")),
        "image/webp",
        0.82,
      );
    });
  } finally {
    bitmap.close();
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("class-connect-backgrounds", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("pictures");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function pictureTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, complete: (value: T) => void) => void,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction("pictures", mode);
    let result: T;
    action(transaction.objectStore("pictures"), (value) => {
      result = value;
    });
    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// Pictures are keyed by "<teacher id>:<class id>" for class banners.
export function loadBannerPhoto(key: string) {
  return pictureTransaction<Blob | null>("readonly", (store, complete) => {
    const request = store.get(key);
    request.onsuccess = () =>
      complete((request.result as Blob | undefined) ?? null);
  });
}

export function saveBannerPhoto(key: string, image: Blob) {
  return pictureTransaction<void>("readwrite", (store) => {
    store.put(image, key);
  });
}

export function deleteBannerPhoto(key: string) {
  return pictureTransaction<void>("readwrite", (store) => {
    store.delete(key);
  });
}
