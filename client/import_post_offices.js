import { PrismaClient } from '../generated/prisma/index.js';
import fs from 'fs';
import { parse } from 'csv-parse';

const prisma = new PrismaClient();

async function importPostOffices() {
  const parser = fs.createReadStream('india_head_post_offices_with_coords.csv')
    .pipe(parse({ columns: true, trim: true }));

  for await (const row of parser) {
    try {
      await prisma.postOffice.create({
        data: {
          city: row.City,
          officeName: row.OfficeName,
          pincode: row.Pincode,
          latitude: parseFloat(row.Latitude),
          longitude: parseFloat(row.Longitude),
        },
      });
      console.log(`Inserted: ${row.OfficeName} (${row.Pincode})`);
    } catch (e) {
      console.error('Error inserting row:', row, e.message);
    }
  }
  await prisma.$disconnect();
  console.log('Import complete');
}

importPostOffices();
