/** The caller's owning realm and exact file handle remain opaque to the image provider contract. */
export type LocalVideoThumbnailFile = Readonly<{path: string}>;
export type LocalVideoThumbnailLease = Readonly<{promise: Promise<string | null>; release: () => void}>;
export type LocalVideoThumbnailLoader<File extends LocalVideoThumbnailFile, Owner> = Readonly<{
  permitted: () => boolean;
  eligible: (file: File) => boolean;
  acquire: (file: File, path: string, owner: Owner, current: () => boolean, onRetired: () => void) => LocalVideoThumbnailLease;
}>;
