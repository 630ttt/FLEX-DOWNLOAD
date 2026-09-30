import {
  DESIGN_PREVIEW_FALLBACK,
  getDesignImageUrl,
  resolveImageUrl,
} from '../utils/designAssets';

const DesignPreviewImage = ({ design, fullSize = false, src, onError, ...imageProps }) => {
  const handleError = (event) => {
    onError?.(event);
    const image = event.currentTarget;
    if (!image.src.endsWith(DESIGN_PREVIEW_FALLBACK)) {
      image.onerror = null;
      image.src = DESIGN_PREVIEW_FALLBACK;
    }
  };

  return (
    <img
      {...imageProps}
      src={src ? resolveImageUrl(src) : getDesignImageUrl(design, fullSize)}
      onError={handleError}
    />
  );
};

export default DesignPreviewImage;
