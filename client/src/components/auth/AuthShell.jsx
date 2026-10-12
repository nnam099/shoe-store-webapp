import { getAssetUrl } from '../../config/site';

const VISUAL_CROPS = {
  identity: 'object-[center_43%] sm:object-[center_47%] lg:object-[center_58%]',
  security: 'object-[center_43%] sm:object-[center_47%] lg:object-[center_54%]',
  passwordResetStepOne: 'object-[center_43%] sm:object-[center_47%] lg:object-[center_72%]',
};

function AuthVisualPanel({ eyebrow, title, railMeta, description, crop }) {
  return (
    <aside className="relative h-[210px] overflow-hidden bg-[#121212] text-white sm:h-[250px] lg:h-auto">
      <img
        src={getAssetUrl('auth/steplab.webp')}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover ${VISUAL_CROPS[crop] || VISUAL_CROPS.identity}`}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.48)_48%,rgba(0,0,0,0.08)_100%)] lg:bg-[linear-gradient(180deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.28)_58%,rgba(0,0,0,0.48)_100%)]"
      />

      <div className="relative z-10 flex h-full flex-col p-6 sm:p-8 lg:p-10 xl:p-11">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-red-200">
            {eyebrow}
          </p>
          {railMeta && (
            <p className="shrink-0 text-[10px] font-bold tracking-[0.2em] text-white/80">
              {railMeta}
            </p>
          )}
        </div>
        <h1 className="mt-3 max-w-[13ch] text-balance font-['Space_Grotesk'] text-2xl font-black uppercase leading-[1.08] tracking-[-0.025em] sm:text-3xl lg:text-[2rem]">
          {title}
        </h1>
        <p className="mt-3 max-w-[35ch] text-xs leading-5 text-white/80">
          {description}
        </p>
      </div>
    </aside>
  );
}

export default function AuthShell({
  eyebrow,
  title,
  railMeta,
  description,
  crop = 'identity',
  children,
  footer,
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <div className="grid grid-cols-1 border border-[#deded8] bg-white shadow-xs lg:grid-cols-[minmax(0,0.43fr)_minmax(0,0.57fr)]">
        <AuthVisualPanel
          eyebrow={eyebrow}
          title={title}
          railMeta={railMeta}
          description={description}
          crop={crop}
        />

        <section className="flex min-w-0 flex-col justify-center p-6 sm:p-9 lg:p-10 xl:p-12">
          {children}
          {footer && (
            <div className="mt-8 border-t border-[#e6e6e2] pt-6 text-xs text-[#525252]">
              {footer}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
