// Bu dosya artık schema.ts içinde tanımlanmış olan şemaları kullanacak
// Bu içerik artık schema.ts dosyasına taşındı, ancak referans olarak burada bırakılıyor

/*
// SEYAHAT YORUMLARI VE DEĞERLENDİRMELERİ - bu şemalar artık schema.ts içinde tanımlanmıştır
const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: integer("user_id").notNull(),
  routeId: integer("route_id").notNull(),
  scheduleId: integer("schedule_id"),
  bookingId: integer("booking_id"),
  rating: integer("rating").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  response: text("response"),
  likes: integer("likes").default(0).notNull(),
  dislikes: integer("dislikes").default(0).notNull(),
  reportCount: integer("report_count").default(0).notNull(),
  images: jsonb("images").default([]).notNull(), // URL'leri saklayacak json array
  isVerifiedPurchase: boolean("is_verified_purchase").default(false),
  socialShares: integer("social_shares").default(0), // Kaç kez paylaşıldığını izle
});

// YORUM BEĞENİLERİ VE OYLARI - bu şemalar artık schema.ts içinde tanımlanmıştır
const reviewVotesTable = pgTable("review_votes", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").notNull(),
  reviewId: integer("review_id").notNull(),
  voteType: text("vote_type").notNull(), // like, dislike, report
});
*/

// ReviewVote types are now defined in schema.ts
/*
export type ReviewVote = typeof reviewVotes.$inferSelect;
export type InsertReviewVote = typeof reviewVotes.$inferInsert;
export const insertReviewVoteSchema = createInsertSchema(reviewVotes).omit({ id: true, createdAt: true });
*/

// SOSYAL MEDYA PAYLAŞIMLARI
// socialShares ilişkileri schema.ts içinde tanımlanacak
/* 
export const socialShares = pgTable("social_shares", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").notNull(),
  bookingId: integer("booking_id"), 
  reviewId: integer("review_id"), 
  contentType: text("content_type").notNull(), // booking, review
  platform: text("platform").notNull(), // facebook, twitter, instagram, whatsapp
  shareUrl: text("share_url"),
  status: text("status").default("completed").notNull(), // pending, completed, failed
  metadata: jsonb("metadata").default({}).notNull(),
});

export type SocialShare = typeof socialShares.$inferSelect;
export type InsertSocialShare = typeof socialShares.$inferInsert;
export const insertSocialShareSchema = createInsertSchema(socialShares).omit({ id: true, createdAt: true });
*/

// KULLANICI DESTEĞİ VE TALEPLERİ
// supportRequests ilişkileri schema.ts içinde tanımlanacak
/* 
export const supportRequests = pgTable("support_requests", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: integer("user_id").notNull(),
  bookingId: integer("booking_id"), // İlgili rezervasyon varsa
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // refund, cancellation, modification, complaint, information
  priority: text("priority").default("normal").notNull(), // low, normal, high, urgent
  status: text("status").default("open").notNull(), // open, in_progress, resolved, closed
  assignedTo: integer("assigned_to"), // Hangi personele atandığı
  resolutionNote: text("resolution_note"),
  isPublic: boolean("is_public").default(false), // Başkalarının görmesi gerekiyor mu
  attachments: jsonb("attachments").default([]).notNull(), // Dosya eklerinin URL'leri
  metadata: jsonb("metadata").default({}).notNull(),
});

export type SupportRequest = typeof supportRequests.$inferSelect;
export type InsertSupportRequest = typeof supportRequests.$inferInsert;
export const insertSupportRequestSchema = createInsertSchema(supportRequests).omit({ id: true, createdAt: true, updatedAt: true });
*/

// DESTEK TALEBİ MESAJLARI
// supportMessages ilişkileri schema.ts içinde tanımlanacak
/*
export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  supportRequestId: integer("support_request_id").notNull(),
  senderId: integer("sender_id").notNull(), // Kullanıcı ID veya personel ID
  isStaff: boolean("is_staff").default(false).notNull(), // Personel mi yoksa kullanıcı mı
  message: text("message").notNull(),
  attachments: jsonb("attachments").default([]).notNull(), // Dosya eklerinin URL'leri
  isRead: boolean("is_read").default(false).notNull(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;
export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({ id: true, createdAt: true });
*/

// KULLANICI BİLDİRİMLERİ
// notifications ilişkileri schema.ts içinde tanımlanacak
/* 
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // booking, payment, review, support, system
  isRead: boolean("is_read").default(false).notNull(),
  relatedId: integer("related_id"), // İlgili işlemin ID'si (bookingId, reviewId vs)
  relatedType: text("related_type"), // İlgili işlemin tipi (booking, review, support-request)
  actionUrl: text("action_url"), // Tıklandığında yönlendirilecek URL
  metadata: jsonb("metadata").default({}).notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
*/

// İLİŞKİLERİ TANIMLA - schema.ts içine taşınıyor
/* 
export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  route: one(routes, {
    fields: [reviews.routeId],
    references: [routes.id],
  }),
  schedule: one(schedules, {
    fields: [reviews.scheduleId],
    references: [schedules.id],
    relationName: "reviewSchedule"
  }),
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
    relationName: "reviewBooking"
  }),
  votes: many(reviewVotes),
  shares: many(socialShares),
}));
*/

// supportRequests ilişkileri schema.ts içinde tanımlanacak
/* 
export const supportRequestsRelations = relations(supportRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [supportRequests.userId],
    references: [users.id],
    relationName: "supportRequestUser"
  }),
  booking: one(bookings, {
    fields: [supportRequests.bookingId],
    references: [bookings.id],
    relationName: "supportRequestBooking"
  }),
  assignedUser: one(users, {
    fields: [supportRequests.assignedTo],
    references: [users.id],
    relationName: "supportRequestAssignee"
  }),
  messages: many(supportMessages),
}));
*/

// supportMessages ilişkileri schema.ts içinde tanımlanacak
/* 
export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  supportRequest: one(supportRequests, {
    fields: [supportMessages.supportRequestId],
    references: [supportRequests.id],
  }),
  sender: one(users, {
    fields: [supportMessages.senderId],
    references: [users.id],
    relationName: "supportMessageSender"
  }),
}));
*/

// notifications ilişkileri schema.ts içinde tanımlanacak
/* 
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "notificationUser"
  }),
}));
*/

// Burada import etmeye çalışmıyoruz çünkü schema.ts zaten bu tabloları içeriyor
// Bu dosya schema.ts içine dahil edilecek ve import etmek döngüsel referans hatası yaratır