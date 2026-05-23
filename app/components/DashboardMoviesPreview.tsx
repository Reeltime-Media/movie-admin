"use client";

import { AdminCard } from "./AdminCard";
import { useMovieCatalog } from "./MovieCatalogProvider";
import { statusClasses } from "../lib/adminData";

export function DashboardMoviesPreview() {
  const { movies } = useMovieCatalog();

  return (
    <AdminCard title="Movie management" action="View all" actionHref="/movie">
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-widest text-text-disabled">
              <th className="px-5 pb-3 font-bold">Title</th>
              <th className="px-5 pb-3 font-bold">Type</th>
              <th className="px-5 pb-3 font-bold">Price</th>
              <th className="px-5 pb-3 font-bold">Watchers</th>
              <th className="px-5 pb-3 font-bold">Rating</th>
              <th className="px-5 pb-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {movies.map((item) => (
              <tr key={item.id} className="text-[13px]">
                <td className="px-5 py-4 font-bold">{item.title}</td>
                <td className="px-5 py-4 text-text-muted">{item.type}</td>
                <td className="px-5 py-4 text-text-muted">{item.price}</td>
                <td className="px-5 py-4 text-text-muted">{item.views}</td>
                <td className="px-5 py-4 text-text-muted">{item.rating}</td>
                <td className="px-5 py-4">
                  <span className={statusClasses(item.status)}>{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}
