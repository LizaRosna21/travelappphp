import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Pencil, Power, Trash2, Car, MapPin, Tag, CalendarClock } from "lucide-react";

// ---------------------------------------------------------------------------
// Tipler ve şemalar
// ---------------------------------------------------------------------------

interface TransferVehicleType {
  id: number;
  name: string;
  description: string | null;
  maxPassengers: number;
  maxLuggage: number | null;
  imageUrl: string | null;
  isActive: boolean;
}

interface TransferRoute {
  id: number;
  originName: string;
  originType: string;
  destinationName: string;
  destinationType: string;
  distance: string | null;
  estimatedDuration: number | null;
  isPopular: boolean;
  isActive: boolean;
}

interface TransferPrice {
  id: number;
  routeId: number;
  vehicleTypeId: number;
  price: string;
  currencyCode: string;
  isOneWay: boolean;
  isActive: boolean;
}

interface TransferBookingRow {
  id: number;
  bookingReference: string;
  pnrNumber: string;
  pickupDate: string;
  pickupTime: string;
  isOneWay: boolean;
  passengerCount: number;
  flightNumber: string | null;
  contactName: string;
  contactPhone: string;
  totalPrice: string;
  currencyCode: string;
  status: string;
  paymentStatus: string;
  route: TransferRoute | null;
  vehicleType: TransferVehicleType | null;
}

interface BookingListResponse {
  bookings: TransferBookingRow[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

const LOCATION_TYPES = [
  { value: "airport", label: "Havaalanı" },
  { value: "hotel", label: "Otel" },
  { value: "port", label: "Liman" },
  { value: "city", label: "Şehir merkezi" },
  { value: "other", label: "Diğer" },
];

const BOOKING_STATUSES = [
  { value: "pending", label: "Beklemede" },
  { value: "confirmed", label: "Onaylandı" },
  { value: "assigned", label: "Sürücü atandı" },
  { value: "completed", label: "Tamamlandı" },
  { value: "cancelled", label: "İptal" },
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  assigned: "default",
  completed: "outline",
  cancelled: "destructive",
};

const vehicleTypeSchema = z.object({
  name: z.string().min(2, "Araç tipi adı en az 2 karakter olmalıdır"),
  description: z.string().optional(),
  maxPassengers: z.coerce.number().int().min(1, "En az 1 yolcu"),
  maxLuggage: z.coerce.number().int().min(0).optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

const routeSchema = z.object({
  originName: z.string().min(2, "Kalkış noktası zorunludur"),
  originType: z.string().min(1, "Kalkış tipi zorunludur"),
  destinationName: z.string().min(2, "Varış noktası zorunludur"),
  destinationType: z.string().min(1, "Varış tipi zorunludur"),
  distance: z.string().optional(),
  estimatedDuration: z.coerce.number().int().min(0).optional(),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const priceSchema = z.object({
  routeId: z.coerce.number().int().positive("Rota seçin"),
  vehicleTypeId: z.coerce.number().int().positive("Araç tipi seçin"),
  price: z.string().min(1, "Fiyat zorunludur"),
  currencyCode: z.string().min(3).max(3).default("TRY"),
  isOneWay: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

type VehicleTypeForm = z.infer<typeof vehicleTypeSchema>;
type RouteForm = z.infer<typeof routeSchema>;
type PriceForm = z.infer<typeof priceSchema>;

const VEHICLE_TYPES_KEY = "/api/admin/transfer/vehicle-types";
const ROUTES_KEY = "/api/admin/transfer/routes";
const PRICES_KEY = "/api/admin/transfer/prices";

function getJson<T>(url: string): Promise<T> {
  return apiRequest("GET", url).then((res) => res.json() as Promise<T>);
}

function locationLabel(type: string) {
  return LOCATION_TYPES.find((t) => t.value === type)?.label ?? type;
}

// ---------------------------------------------------------------------------
// Sayfa
// ---------------------------------------------------------------------------

export default function TransfersPage() {
  const queryClient = useQueryClient();

  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<TransferVehicleType | null>(null);
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransferRoute | null>(null);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);

  const [bookingStatus, setBookingStatus] = useState<string>("all");
  const [bookingSearch, setBookingSearch] = useState("");

  // --- Sorgular ---

  const { data: vehicleTypes = [], isLoading: loadingVehicles } = useQuery({
    queryKey: [VEHICLE_TYPES_KEY],
    queryFn: () => getJson<TransferVehicleType[]>(VEHICLE_TYPES_KEY),
  });

  const { data: routes = [], isLoading: loadingRoutes } = useQuery({
    queryKey: [ROUTES_KEY],
    queryFn: () => getJson<TransferRoute[]>(ROUTES_KEY),
  });

  const { data: prices = [], isLoading: loadingPrices } = useQuery({
    queryKey: [PRICES_KEY],
    queryFn: () => getJson<TransferPrice[]>(PRICES_KEY),
  });

  const bookingsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (bookingStatus !== "all") params.set("status", bookingStatus);
    if (bookingSearch.trim()) params.set("search", bookingSearch.trim());
    params.set("limit", "50");
    return `/api/admin/transfer/bookings?${params.toString()}`;
  }, [bookingStatus, bookingSearch]);

  const { data: bookingData, isLoading: loadingBookings } = useQuery({
    queryKey: [bookingsUrl],
    queryFn: () => getJson<BookingListResponse>(bookingsUrl),
  });

  const bookings = bookingData?.bookings ?? [];

  // --- Yardımcı eşlemeler ---

  const routeById = useMemo(
    () => new Map(routes.map((route) => [route.id, route])),
    [routes],
  );
  const vehicleById = useMemo(
    () => new Map(vehicleTypes.map((vehicle) => [vehicle.id, vehicle])),
    [vehicleTypes],
  );

  // --- Formlar ---

  const vehicleForm = useForm<VehicleTypeForm>({
    resolver: zodResolver(vehicleTypeSchema),
    defaultValues: { name: "", description: "", maxPassengers: 4, maxLuggage: 4, imageUrl: "", isActive: true },
  });

  const routeForm = useForm<RouteForm>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      originName: "",
      originType: "airport",
      destinationName: "",
      destinationType: "hotel",
      distance: "",
      estimatedDuration: 45,
      isPopular: false,
      isActive: true,
    },
  });

  const priceForm = useForm<PriceForm>({
    resolver: zodResolver(priceSchema),
    defaultValues: { routeId: 0, vehicleTypeId: 0, price: "", currencyCode: "TRY", isOneWay: true, isActive: true },
  });

  // --- Ortak mutation davranışı ---

  function mutationHandlers(key: string, successMessage: string, onDone?: () => void) {
    return {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [key] });
        toast({ title: "Kaydedildi", description: successMessage });
        onDone?.();
      },
      onError: (error: Error) => {
        toast({ title: "İşlem başarısız", description: error.message, variant: "destructive" });
      },
    };
  }

  // --- Araç tipi mutasyonları ---

  const saveVehicle = useMutation({
    mutationFn: async (values: VehicleTypeForm) => {
      const url = editingVehicle ? `${VEHICLE_TYPES_KEY}/${editingVehicle.id}` : VEHICLE_TYPES_KEY;
      const res = await apiRequest(editingVehicle ? "PATCH" : "POST", url, values);
      return res.json();
    },
    ...mutationHandlers(VEHICLE_TYPES_KEY, "Araç tipi kaydedildi", () => {
      setVehicleDialogOpen(false);
      setEditingVehicle(null);
      vehicleForm.reset();
    }),
  });

  const toggleVehicle = useMutation({
    mutationFn: async (vehicle: TransferVehicleType) => {
      const res = await apiRequest("PATCH", `${VEHICLE_TYPES_KEY}/${vehicle.id}`, {
        isActive: !vehicle.isActive,
      });
      return res.json();
    },
    ...mutationHandlers(VEHICLE_TYPES_KEY, "Araç tipi durumu güncellendi"),
  });

  // --- Rota mutasyonları ---

  const saveRoute = useMutation({
    mutationFn: async (values: RouteForm) => {
      const url = editingRoute ? `${ROUTES_KEY}/${editingRoute.id}` : ROUTES_KEY;
      const res = await apiRequest(editingRoute ? "PATCH" : "POST", url, {
        ...values,
        distance: values.distance || null,
      });
      return res.json();
    },
    ...mutationHandlers(ROUTES_KEY, "Rota kaydedildi", () => {
      setRouteDialogOpen(false);
      setEditingRoute(null);
      routeForm.reset();
    }),
  });

  const toggleRoute = useMutation({
    mutationFn: async (route: TransferRoute) => {
      const res = await apiRequest("PATCH", `${ROUTES_KEY}/${route.id}`, { isActive: !route.isActive });
      return res.json();
    },
    ...mutationHandlers(ROUTES_KEY, "Rota durumu güncellendi"),
  });

  // --- Fiyat mutasyonları ---

  const savePrice = useMutation({
    mutationFn: async (values: PriceForm) => {
      const res = await apiRequest("POST", PRICES_KEY, values);
      return res.json();
    },
    ...mutationHandlers(PRICES_KEY, "Fiyat kaydedildi", () => {
      setPriceDialogOpen(false);
      priceForm.reset();
    }),
  });

  const deletePrice = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `${PRICES_KEY}/${id}`);
      return res.json();
    },
    ...mutationHandlers(PRICES_KEY, "Fiyat silindi"),
  });

  // --- Rezervasyon mutasyonu ---

  const changeBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/transfer/bookings/${id}/status`, { status });
      return res.json();
    },
    ...mutationHandlers(bookingsUrl, "Rezervasyon durumu güncellendi"),
  });

  // --- Düzenleme açıcıları ---

  function openVehicleDialog(vehicle?: TransferVehicleType) {
    setEditingVehicle(vehicle ?? null);
    vehicleForm.reset(
      vehicle
        ? {
            name: vehicle.name,
            description: vehicle.description ?? "",
            maxPassengers: vehicle.maxPassengers,
            maxLuggage: vehicle.maxLuggage ?? 0,
            imageUrl: vehicle.imageUrl ?? "",
            isActive: vehicle.isActive,
          }
        : { name: "", description: "", maxPassengers: 4, maxLuggage: 4, imageUrl: "", isActive: true },
    );
    setVehicleDialogOpen(true);
  }

  function openRouteDialog(route?: TransferRoute) {
    setEditingRoute(route ?? null);
    routeForm.reset(
      route
        ? {
            originName: route.originName,
            originType: route.originType,
            destinationName: route.destinationName,
            destinationType: route.destinationType,
            distance: route.distance ?? "",
            estimatedDuration: route.estimatedDuration ?? 0,
            isPopular: route.isPopular,
            isActive: route.isActive,
          }
        : {
            originName: "",
            originType: "airport",
            destinationName: "",
            destinationType: "hotel",
            distance: "",
            estimatedDuration: 45,
            isPopular: false,
            isActive: true,
          },
    );
    setRouteDialogOpen(true);
  }

  const activeRoutes = routes.filter((route) => route.isActive);
  const activeVehicles = vehicleTypes.filter((vehicle) => vehicle.isActive);

  return (
    <AdminLayout>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transfer Yönetimi</h1>
          <p className="text-muted-foreground">
            Havaalanı ve şehir içi transfer rotaları, araç tipleri, fiyatlar ve rezervasyonlar
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard icon={Car} label="Aktif araç tipi" value={activeVehicles.length} />
          <SummaryCard icon={MapPin} label="Aktif rota" value={activeRoutes.length} />
          <SummaryCard icon={Tag} label="Tanımlı fiyat" value={prices.length} />
          <SummaryCard
            icon={CalendarClock}
            label="Rezervasyon"
            value={bookingData?.pagination.total ?? 0}
          />
        </div>

        <Tabs defaultValue="bookings">
          <TabsList>
            <TabsTrigger value="bookings">Rezervasyonlar</TabsTrigger>
            <TabsTrigger value="routes">Rotalar</TabsTrigger>
            <TabsTrigger value="vehicles">Araç Tipleri</TabsTrigger>
            <TabsTrigger value="prices">Fiyatlar</TabsTrigger>
          </TabsList>

          {/* ---------------- Rezervasyonlar ---------------- */}
          <TabsContent value="bookings" className="mt-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id="transfer-booking-search"
                placeholder="Referans, PNR, ad veya telefon ara"
                value={bookingSearch}
                onChange={(event) => setBookingSearch(event.target.value)}
                className="sm:max-w-xs"
              />
              <Select value={bookingStatus} onValueChange={setBookingStatus}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm durumlar</SelectItem>
                  {BOOKING_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referans</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Alış</TableHead>
                    <TableHead>Yolcu</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBookings ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : bookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Bu filtrelerle eşleşen transfer rezervasyonu yok.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="font-medium">{booking.bookingReference}</div>
                          <div className="text-xs text-muted-foreground">PNR {booking.pnrNumber}</div>
                        </TableCell>
                        <TableCell>
                          {booking.route
                            ? `${booking.route.originName} → ${booking.route.destinationName}`
                            : "—"}
                          <div className="text-xs text-muted-foreground">
                            {booking.vehicleType?.name ?? "—"}
                            {booking.isOneWay ? " · Tek yön" : " · Gidiş-dönüş"}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {booking.pickupDate}
                          <div className="text-xs text-muted-foreground">
                            {booking.pickupTime}
                            {booking.flightNumber ? ` · ${booking.flightNumber}` : ""}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{booking.passengerCount}</TableCell>
                        <TableCell>
                          {booking.contactName}
                          <div className="text-xs text-muted-foreground">{booking.contactPhone}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {booking.totalPrice} {booking.currencyCode}
                          <div className="text-xs text-muted-foreground">{booking.paymentStatus}</div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={booking.status}
                            onValueChange={(status) =>
                              changeBookingStatus.mutate({ id: booking.id, status })
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BOOKING_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ---------------- Rotalar ---------------- */}
          <TabsContent value="routes" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openRouteDialog()} className="gap-2">
                    <Plus className="h-4 w-4" /> Yeni rota
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingRoute ? "Rotayı düzenle" : "Yeni transfer rotası"}</DialogTitle>
                    <DialogDescription>
                      Kalkış ve varış noktalarını, tipleriyle birlikte tanımlayın.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...routeForm}>
                    <form
                      onSubmit={routeForm.handleSubmit((values) => saveRoute.mutate(values))}
                      className="space-y-4"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={routeForm.control}
                          name="originName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kalkış</FormLabel>
                              <FormControl>
                                <Input id="route-origin-name" placeholder="İstanbul Havalimanı" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={routeForm.control}
                          name="originType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kalkış tipi</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger id="route-origin-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {LOCATION_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={routeForm.control}
                          name="destinationName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Varış</FormLabel>
                              <FormControl>
                                <Input id="route-destination-name" placeholder="Taksim" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={routeForm.control}
                          name="destinationType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Varış tipi</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger id="route-destination-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {LOCATION_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={routeForm.control}
                          name="distance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mesafe (km)</FormLabel>
                              <FormControl>
                                <Input id="route-distance" placeholder="42" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={routeForm.control}
                          name="estimatedDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tahmini süre (dk)</FormLabel>
                              <FormControl>
                                <Input id="route-duration" type="number" min={0} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={routeForm.control}
                        name="isPopular"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-md border p-3">
                            <div>
                              <FormLabel>Popüler rota</FormLabel>
                              <FormDescription>Ana sayfada öne çıkarılır.</FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                id="route-popular"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={saveRoute.isPending}>
                          {saveRoute.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Kaydet
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rota</TableHead>
                    <TableHead>Mesafe / süre</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRoutes ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : routes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        Henüz transfer rotası tanımlanmamış.
                      </TableCell>
                    </TableRow>
                  ) : (
                    routes.map((route) => (
                      <TableRow key={route.id}>
                        <TableCell>
                          <div className="font-medium">
                            {route.originName} → {route.destinationName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {locationLabel(route.originType)} → {locationLabel(route.destinationType)}
                            {route.isPopular ? " · Popüler" : ""}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums whitespace-nowrap">
                          {route.distance ? `${route.distance} km` : "—"}
                          <div className="text-xs text-muted-foreground">
                            {route.estimatedDuration ? `${route.estimatedDuration} dk` : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={route.isActive ? "default" : "secondary"}>
                            {route.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openRouteDialog(route)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Düzenle</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRoute.mutate(route)}
                            >
                              <Power className="h-4 w-4" />
                              <span className="sr-only">
                                {route.isActive ? "Pasife al" : "Aktifleştir"}
                              </span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ---------------- Araç tipleri ---------------- */}
          <TabsContent value="vehicles" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openVehicleDialog()} className="gap-2">
                    <Plus className="h-4 w-4" /> Yeni araç tipi
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingVehicle ? "Araç tipini düzenle" : "Yeni araç tipi"}
                    </DialogTitle>
                    <DialogDescription>
                      Kapasite bilgileri rezervasyon sırasında sunucu tarafında doğrulanır.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...vehicleForm}>
                    <form
                      onSubmit={vehicleForm.handleSubmit((values) => saveVehicle.mutate(values))}
                      className="space-y-4"
                    >
                      <FormField
                        control={vehicleForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ad</FormLabel>
                            <FormControl>
                              <Input id="vehicle-name" placeholder="Vito (VIP)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={vehicleForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Açıklama</FormLabel>
                            <FormControl>
                              <Textarea id="vehicle-description" rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={vehicleForm.control}
                          name="maxPassengers"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Azami yolcu</FormLabel>
                              <FormControl>
                                <Input id="vehicle-max-passengers" type="number" min={1} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={vehicleForm.control}
                          name="maxLuggage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Azami bagaj</FormLabel>
                              <FormControl>
                                <Input id="vehicle-max-luggage" type="number" min={0} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={saveVehicle.isPending}>
                          {saveVehicle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Kaydet
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Araç tipi</TableHead>
                    <TableHead className="text-right">Yolcu</TableHead>
                    <TableHead className="text-right">Bagaj</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingVehicles ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : vehicleTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        Henüz araç tipi tanımlanmamış.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicleTypes.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell>
                          <div className="font-medium">{vehicle.name}</div>
                          {vehicle.description && (
                            <div className="text-xs text-muted-foreground">{vehicle.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{vehicle.maxPassengers}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {vehicle.maxLuggage ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={vehicle.isActive ? "default" : "secondary"}>
                            {vehicle.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openVehicleDialog(vehicle)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Düzenle</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleVehicle.mutate(vehicle)}
                            >
                              <Power className="h-4 w-4" />
                              <span className="sr-only">
                                {vehicle.isActive ? "Pasife al" : "Aktifleştir"}
                              </span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ---------------- Fiyatlar ---------------- */}
          <TabsContent value="prices" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" disabled={activeRoutes.length === 0 || activeVehicles.length === 0}>
                    <Plus className="h-4 w-4" /> Fiyat tanımla
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transfer fiyatı</DialogTitle>
                    <DialogDescription>
                      Aynı rota, araç ve yön için zaten bir fiyat varsa üzerine yazılır.
                      Gidiş-dönüş fiyatı tanımlanmazsa tek yönün iki katı uygulanır.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...priceForm}>
                    <form
                      onSubmit={priceForm.handleSubmit((values) => savePrice.mutate(values))}
                      className="space-y-4"
                    >
                      <FormField
                        control={priceForm.control}
                        name="routeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rota</FormLabel>
                            <Select
                              value={field.value ? String(field.value) : ""}
                              onValueChange={(value) => field.onChange(Number(value))}
                            >
                              <FormControl>
                                <SelectTrigger id="price-route">
                                  <SelectValue placeholder="Rota seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {activeRoutes.map((route) => (
                                  <SelectItem key={route.id} value={String(route.id)}>
                                    {route.originName} → {route.destinationName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={priceForm.control}
                        name="vehicleTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Araç tipi</FormLabel>
                            <Select
                              value={field.value ? String(field.value) : ""}
                              onValueChange={(value) => field.onChange(Number(value))}
                            >
                              <FormControl>
                                <SelectTrigger id="price-vehicle">
                                  <SelectValue placeholder="Araç tipi seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {activeVehicles.map((vehicle) => (
                                  <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                                    {vehicle.name} ({vehicle.maxPassengers} kişi)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={priceForm.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fiyat</FormLabel>
                              <FormControl>
                                <Input id="price-amount" placeholder="1250.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={priceForm.control}
                          name="currencyCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Para birimi</FormLabel>
                              <FormControl>
                                <Input id="price-currency" maxLength={3} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={priceForm.control}
                        name="isOneWay"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-md border p-3">
                            <div>
                              <FormLabel>Tek yön fiyatı</FormLabel>
                              <FormDescription>
                                Kapalıysa bu tutar gidiş-dönüş fiyatı olarak kaydedilir.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                id="price-one-way"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={savePrice.isPending}>
                          {savePrice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Kaydet
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rota</TableHead>
                    <TableHead>Araç tipi</TableHead>
                    <TableHead>Yön</TableHead>
                    <TableHead className="text-right">Fiyat</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPrices ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : prices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        Henüz fiyat tanımlanmamış. Fiyatı olmayan rota rezervasyona kapalıdır.
                      </TableCell>
                    </TableRow>
                  ) : (
                    prices.map((price) => {
                      const route = routeById.get(price.routeId);
                      const vehicle = vehicleById.get(price.vehicleTypeId);

                      return (
                        <TableRow key={price.id}>
                          <TableCell>
                            {route ? `${route.originName} → ${route.destinationName}` : `#${price.routeId}`}
                          </TableCell>
                          <TableCell>{vehicle?.name ?? `#${price.vehicleTypeId}`}</TableCell>
                          <TableCell>{price.isOneWay ? "Tek yön" : "Gidiş-dönüş"}</TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap">
                            {price.price} {price.currencyCode}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePrice.mutate(price.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Sil</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Car;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
