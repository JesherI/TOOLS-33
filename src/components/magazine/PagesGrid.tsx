import { PageThumbnail, type PageItem } from "./PageThumbnail";

interface PagesGridProps {
  pages: PageItem[];
}

export function PagesGrid({ pages }: PagesGridProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3 max-h-[50vh] overflow-y-auto p-3 bg-white/5 rounded-xl border border-white/10 scrollbar-hide">
      {pages.map((page) => (
        <PageThumbnail key={page.id} page={page} />
      ))}
    </div>
  );
}

export { type PageItem } from "./PageThumbnail";
