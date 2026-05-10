export type Status = "Published" | "Draft" | "Scheduled" | "Review";
export type RevenueKind = "Rental" | "Subscription" | "Ownership";

export const stats = [
  { label: "Monthly revenue", value: "$18.4K", delta: "+12.8%", tone: "text-success" },
  { label: "Active subscribers", value: "3,842", delta: "+268", tone: "text-success" },
  { label: "Movie rentals", value: "1,128", delta: "+9.4%", tone: "text-success" },
  { label: "Pending reviews", value: "14", delta: "4 urgent", tone: "text-warning" },
];

export const catalog: Array<{
  title: string;
  type: "Movie" | "Series";
  price: string;
  views: string;
  rating: string;
  status: Status;
  genre: string;
  owner: string;
}> = [
  {
    title: "The Last Drive",
    type: "Movie",
    price: "$2.99",
    views: "82.4K",
    rating: "8.7",
    status: "Published",
    genre: "Action Thriller",
    owner: "Content team",
  },
  {
    title: "Echo Valley",
    type: "Series",
    price: "Premium",
    views: "64.8K",
    rating: "8.4",
    status: "Published",
    genre: "Drama",
    owner: "Series team",
  },
  {
    title: "Neon Quarter",
    type: "Series",
    price: "Premium",
    views: "31.2K",
    rating: "8.1",
    status: "Scheduled",
    genre: "Sci-Fi",
    owner: "Series team",
  },
  {
    title: "Burn Line",
    type: "Movie",
    price: "$3.99",
    views: "18.9K",
    rating: "7.9",
    status: "Review",
    genre: "Crime",
    owner: "Commerce",
  },
  {
    title: "Night Ferry",
    type: "Movie",
    price: "$2.99",
    views: "12.7K",
    rating: "7.6",
    status: "Draft",
    genre: "Thriller",
    owner: "Content team",
  },
];

export const moderationQueue = [
  { title: "Crown of Ash", detail: "Poster artwork changed", owner: "Content team", due: "Today" },
  { title: "City Loom", detail: "Episode 4 captions ready", owner: "Localization", due: "Tomorrow" },
  { title: "River Signal", detail: "Rental price update", owner: "Commerce", due: "May 13" },
];

export const revenueMix: Array<{ label: RevenueKind; amount: string; share: string; bar: string }> = [
  { label: "Subscription", amount: "$10.9K", share: "59%", bar: "w-[59%]" },
  { label: "Rental", amount: "$4.8K", share: "26%", bar: "w-[26%]" },
  { label: "Ownership", amount: "$2.7K", share: "15%", bar: "w-[15%]" },
];

export const users = [
  { name: "Bunkheangheng", plan: "Free", library: "4 titles", spend: "$12.46", status: "Active" },
  { name: "Dara Sok", plan: "Premium", library: "18 titles", spend: "$64.91", status: "Active" },
  { name: "Malis Chan", plan: "Premium", library: "22 titles", spend: "$79.38", status: "Active" },
  { name: "Sophea Kim", plan: "Free", library: "3 titles", spend: "$8.97", status: "At risk" },
];

export const payments = [
  { id: "RT-1048", customer: "Dara Sok", item: "Premium subscription", amount: "$6.99", status: "Paid" },
  { id: "RT-1047", customer: "Bunkheangheng", item: "The Last Drive", amount: "$2.99", status: "Paid" },
  { id: "RT-1046", customer: "Malis Chan", item: "After Hours", amount: "$3.99", status: "Paid" },
  { id: "RT-1045", customer: "Sophea Kim", item: "Night Ferry", amount: "$2.99", status: "Refund review" },
];

export const reportCards = [
  { title: "Top city", value: "Phnom Penh", detail: "42% of plays this month" },
  { title: "Best title", value: "The Last Drive", detail: "Highest rental conversion" },
  { title: "Peak time", value: "9 PM", detail: "Friday and Saturday lead" },
];

export function statusClasses(status: Status) {
  const base = "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]";
  const tones = {
    Published: "bg-success/15 text-success",
    Draft: "bg-text-disabled/25 text-text-muted",
    Scheduled: "bg-brand/15 text-brand",
    Review: "bg-warning/15 text-warning",
  };

  return `${base} ${tones[status]}`;
}
