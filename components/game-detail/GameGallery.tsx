import Image from 'next/image';

export interface GalleryShot {
  id: string;
  src: string;
  label: string;
  objectPosition: string;
}

interface GameGalleryProps {
  gameName: string;
  description: string;
  shots: GalleryShot[];
  selectedShot: number;
  onSelectShot: (index: number) => void;
}

export function GameGallery({
  gameName,
  description,
  shots,
  selectedShot,
  onSelectShot,
}: GameGalleryProps) {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.16em] text-[#8fb8d5]">GAME DETAILS</p>
      <h1 className="mt-2 text-3xl font-black text-[#d8e6f3]">{gameName}</h1>
      <p className="mt-3 text-sm text-[#9eb4c8]">{description}</p>

      <div className="relative mt-5 aspect-video overflow-hidden rounded-xl border border-[#66c0f444] bg-[#102030]">
        <Image
          src={shots[selectedShot].src}
          alt={`${gameName}-${shots[selectedShot].label}`}
          fill
          style={{ objectFit: 'cover', objectPosition: shots[selectedShot].objectPosition }}
          priority
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {shots.map((shot, index) => (
          <button
            key={shot.id}
            type="button"
            onClick={() => onSelectShot(index)}
            className={`relative aspect-video overflow-hidden rounded-lg border transition ${
              selectedShot === index
                ? 'border-[#66c0f4] ring-1 ring-[#66c0f4]'
                : 'border-[#66c0f433] hover:border-[#66c0f477]'
            }`}
          >
            <Image
              src={shot.src}
              alt={`${gameName}-${shot.label}`}
              fill
              style={{ objectFit: 'cover', objectPosition: shot.objectPosition }}
            />
            <span className="absolute bottom-1 left-1 rounded bg-[#0f1a25d9] px-1.5 py-0.5 text-[10px] text-[#c2d9ec]">
              {shot.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
