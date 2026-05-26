import 'dotenv/config';
import { configureCloudinary, cloudinary } from '../src/lib/cloudinary';

async function main() {
  configureCloudinary();
  const prefixes = ['tandilurban/propiedades', 'tandilurban/general', 'tandilurban'];
  const out: Record<string, unknown> = {};

  for (const prefix of prefixes) {
    const res = await cloudinary.api.resources({
      type: 'upload',
      prefix,
      max_results: 500,
      resource_type: 'image',
    });
    out[prefix] = res.resources.map((r: { public_id: string; secure_url: string; folder?: string }) => ({
      public_id: r.public_id,
      secure_url: r.secure_url,
      folder: r.folder,
    }));
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
