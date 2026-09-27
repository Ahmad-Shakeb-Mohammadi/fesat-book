import path from "path";
import { fileURLToPath } from "url";
const fileName = fileURLToPath(import.meta.url)
const __dirname = path.dirname(fileName)
export default __dirname;