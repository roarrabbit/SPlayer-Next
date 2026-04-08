import router from "@/router";

/** 跳转到本地专辑页 */
export const navigateToAlbum = (albumName?: string) => {
  if (!albumName?.trim()) return;
  router.push({
    name: "collection",
    params: { source: "local", type: "album", id: encodeURIComponent(albumName) },
  });
};
