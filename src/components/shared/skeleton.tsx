
export { AppLoader as default } from "@/components/ui/loading-state";
export {
  AppLoader,
  PageSpinner,
  PortalListLoading,
  PortalFormLoading,
  DashboardListLoading,
  ListSkeleton,
  FormSkeleton,
} from "@/components/ui/loading-state";

// Legacy named exports — all render AppLoader inline
export function Skeleton() { return null; }
export function PageHeaderSkeleton()   { return null; }
export function ProductCardSkeleton()  { return null; }
export function TableRowSkeleton()     { return null; }
export function CartItemSkeleton()     { return null; }
export function ProductGridSkeleton()  { return null; }
export function ListItemSkeleton()     { return null; }