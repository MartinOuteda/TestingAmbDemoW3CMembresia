'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Tarjeta del documento con volteo 3D (anverso ↔ reverso) al tocarla. Las dos caras se montan
// una sobre otra (backface-visibility) y framer-motion anima la rotación en Y.
export default function DocumentFlipCard({
  frontSrc,
  frontLabel,
  backSrc,
  backLabel,
}: {
  frontSrc: string;
  frontLabel: string;
  backSrc: string;
  backLabel: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="doc-flip-wrap">
      <button
        type="button"
        className="doc-flip"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? `Mostrar ${frontLabel.toLowerCase()} del documento` : `Mostrar ${backLabel.toLowerCase()} del documento`}
      >
        <motion.div
          className="doc-flip-inner"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <div className="doc-face">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frontSrc} alt={`${frontLabel} del documento presentado`} />
          </div>
          <div className="doc-face doc-face-back">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={backSrc} alt={`${backLabel} del documento presentado`} />
          </div>
        </motion.div>
      </button>
      <div className="doc-flip-caption">
        {flipped ? backLabel : frontLabel} · toca la tarjeta para girarla
      </div>
    </div>
  );
}
