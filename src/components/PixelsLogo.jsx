import React from "react";

export default function PixelsLogo({ className = "h-6 w-6", title = "Pixels" }) {
  return (
    <img src="/pixels.svg" alt={title} className={className} />
  );
}
