import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-[#991b1b]">Lỗi 404</p>
      <h1 className="mt-4 font-['Space_Grotesk'] text-3xl font-extrabold uppercase tracking-tight text-[#121212] sm:text-5xl">
        Không tìm thấy trang
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-[#525252] sm:text-base">
        Địa chỉ bạn truy cập không tồn tại hoặc đã được thay đổi.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex min-h-[44px] items-center justify-center border border-[#121212] bg-[#121212] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#991b1b] hover:bg-[#991b1b] focus-visible:outline-2 focus-visible:outline-[#991b1b] focus-visible:outline-offset-4"
      >
        Về trang chủ
      </Link>
    </section>
  );
}
