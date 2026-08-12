-- AlterTable
ALTER TABLE "agendamento" ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "syncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "google_calendar_connection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "googleAccountEmail" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "watchChannelId" TEXT,
    "watchChannelToken" TEXT,
    "watchResourceId" TEXT,
    "watchExpiresAt" TIMESTAMP(3),
    "syncToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_calendar_connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_connection_memberId_key" ON "google_calendar_connection"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_connection_watchChannelId_key" ON "google_calendar_connection"("watchChannelId");

-- CreateIndex
CREATE INDEX "google_calendar_connection_organizationId_idx" ON "google_calendar_connection"("organizationId");

-- CreateIndex
CREATE INDEX "agendamento_googleEventId_idx" ON "agendamento"("googleEventId");

-- CreateIndex
CREATE UNIQUE INDEX "agendamento_organizationId_googleEventId_key" ON "agendamento"("organizationId", "googleEventId");

-- AddForeignKey
ALTER TABLE "google_calendar_connection" ADD CONSTRAINT "google_calendar_connection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_connection" ADD CONSTRAINT "google_calendar_connection_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
