import type { Access, CollectionConfig } from "payload"

const admin: Access = ({ req }) => req.user?.collection === "admins"

export const CompetitionEvents: CollectionConfig = {
  slug: "competition-events",
  labels: { singular: "Giải đấu", plural: "Giải đấu" },
  admin: {
    // Đã gỡ khỏi giao diện; giữ collection để không mất dữ liệu cũ.
    hidden: true,
    group: "SportDNA",
    useAsTitle: "name",
    defaultColumns: ["name", "sport", "competitionLevel", "verificationStatus"],
  },
  access: {
    read: () => true,
    create: admin,
    update: admin,
    delete: admin,
  },
  fields: [
    { name: "name", type: "text", required: true, index: true },
    { name: "organizer", type: "text", required: true },
    {
      name: "sport",
      type: "select",
      required: true,
      options: ["football", "badminton"],
    },
    {
      name: "competitionLevel",
      type: "select",
      required: true,
      options: [
        "club",
        "school_local",
        "provincial",
        "national",
        "international",
        "continental_world",
      ],
      admin: {
        description: "Cấp giải do reviewer xác nhận, không suy ra từ tên giải.",
      },
    },
    { name: "startDate", type: "date", required: true },
    { name: "endDate", type: "date" },
    { name: "participantCount", type: "number", min: 1 },
    { name: "seasonId", type: "text" },
    { name: "seriesId", type: "text", index: true },
    { name: "officialSourceUrl", type: "text" },
    {
      name: "verificationStatus",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: ["pending", "verified", "rejected", "need_more_proof"],
    },
  ],
}
