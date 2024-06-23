import { glob } from "glob";
import { readFile, mkdir, copyFile, writeFile } from "node:fs/promises";
import { basename, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const modelbinPattern = "./**/*.modelbin";
const parentDir = join(__dirname, "..");
const outputDir = join(__dirname, "ExtractedTextures");
const texturesDir = join(__dirname, "textures");

async function getSwatchbins() {
	try {
		const modelbins = await glob(modelbinPattern);
		const uniqueMaterialPaths = new Set(); // Store unique .materialbin paths
		const uniqueSwatchPaths = new Set(); // Store unique .swatchbin paths
		// Extract unique .materialbin paths
		for (const modelbin of modelbins) {
			const data = await readFile(modelbin, "utf8");
			const materialRegex =
				/Game:[\/\\]Media[\/\\]cars[\/\\]_library[\/\\]materials[\/\\].+?\.materialbin/g;
			let match;
			while ((match = materialRegex.exec(data)) !== null) {
				const fullPath = match[0];

				const materialPath = fullPath.replace("Game:\\Media\\cars\\", "");
				uniqueMaterialPaths.add(materialPath);
			}
		}

		// Extract unique .swatchbin paths from each .materialbin file
		for (const materialPath of uniqueMaterialPaths) {
			const materialFullPath = join(parentDir, materialPath);

			const materialData = await readFile(materialFullPath, "utf8");
			const swatchRegex =
				/Game:[\/\\]Media[\/\\]cars[\/\\]_library[\/\\]textures[\/\\].+?\.swatchbin/g;
			let match;
			while ((match = swatchRegex.exec(materialData)) !== null) {
				const fullPath = match[0];
				const swatchFile = fullPath.replace("Game:\\Media\\cars", parentDir);
				uniqueSwatchPaths.add(swatchFile);
			}
		}

		// Extract unique .swatchbin paths from each .modelbin file
		for (const modelbin of modelbins) {
			const modelbinData = await readFile(modelbin, "utf8");
			const swatchRegex =
				/Game:[\/\\]Media[\/\\]cars[\/\\]_library[\/\\]textures[\/\\].+?\.swatchbin/g;
			let match;
			while ((match = swatchRegex.exec(modelbinData)) !== null) {
				const fullPath = match[0];
				const swatchFile = fullPath.replace("Game:\\Media\\cars", parentDir);
				uniqueSwatchPaths.add(swatchFile);
			}
		}

		// Copy unique .swatchbin files to output directory
		if (uniqueSwatchPaths.size > 0) {
			await mkdir(outputDir, { recursive: true });

			for (const swatchFile of uniqueSwatchPaths) {
				const swatchFilename = basename(swatchFile);
				const destination = join(outputDir, swatchFilename);
				await copyFile(swatchFile, destination);
			}
		} else {
			console.log("No unique swatchbin filenames found in materialbin files.");
		}

		// Copy .swatchbin files from textures directory to output directory
		const textures = await glob(`${texturesDir}/**/*.swatchbin`);
		if (textures.length > 0) {
			for (const texture of textures) {
				const textureFilename = basename(texture);
				const destination = join(outputDir, textureFilename);
				await copyFile(texture, destination);
			}
			console.log("Finished");
		} else {
			console.log("No swatchbin files found in textures directory.");
		}
	} catch (err) {
		console.error("Error:", err);
	}
}


async function searchMaterialbins() {
	try {
		const modelbins = await glob(modelbinPattern);
		const pathMap = new Map();

		for (const modelbin of modelbins) {
			const data = await readFile(modelbin, "utf8");
			const regex =
				/Game:[\/\\]Media[\/\\]cars[\/\\]_library[\/\\]materials[\/\\].+?\.materialbin/g;
			let match;

			while ((match = regex.exec(data)) !== null) {
				const relativePath = match[0].replace("Game:\\Media\\cars\\", ""); // Extract relative path

				if (!pathMap.has(modelbin)) {
					pathMap.set(modelbin, []);
				}
				pathMap.get(modelbin).push(relativePath); // Store relative path
			}
		}

		const categorization = {};

		if (pathMap.size > 0) {
			pathMap.forEach((materials, modelbin) => {
				categorization[modelbin] = materials;
			});

			await writeFile(
				"materials.json",
				JSON.stringify(categorization, null, 2),
				"utf8",
			);
			console.log("Modelbins and their materials written to materials.json");
		} else {
			console.log("No modelbin files found.");
		}
	} catch (err) {
		console.error("Error:", err);
	}
}
await getSwatchbins();
await searchMaterialbins();
