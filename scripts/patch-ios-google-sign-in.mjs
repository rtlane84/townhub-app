/**
 * Patch iOS Info.plist with Google Sign-In client IDs + reversed URL scheme.
 * Called by pre-ios-sync when VITE_GOOGLE_IOS_CLIENT_ID is set.
 *
 * Reversed client ID for
 *   123-abc.apps.googleusercontent.com
 * is
 *   com.googleusercontent.apps.123-abc
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const plistPath = join(root, "artifacts/townhub/ios/App/App/Info.plist");

const iosClientId = process.env.VITE_GOOGLE_IOS_CLIENT_ID?.trim() ?? "";
const serverClientId = process.env.VITE_GOOGLE_SERVER_CLIENT_ID?.trim() ?? "";

function reversedGoogleClientId(clientId) {
  const suffix = ".apps.googleusercontent.com";
  if (!clientId.endsWith(suffix)) {
    throw new Error(
      `VITE_GOOGLE_IOS_CLIENT_ID must end with ${suffix} (got ${clientId})`,
    );
  }
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

function upsertPlistString(plist, key, value) {
  const keyTag = `\t<key>${key}</key>\n`;
  const valueTag = `\t<string>${value}</string>\n`;
  const existing = new RegExp(
    `\\t<key>${key}</key>\\s*\\t<string>[^<]*</string>\\n`,
  );
  if (existing.test(plist)) {
    return plist.replace(existing, keyTag + valueTag);
  }
  return plist.replace(
    /\t<\/dict>\n<\/plist>\n?\s*$/,
    `${keyTag}${valueTag}\t</dict>\n</plist>\n`,
  );
}

function ensureGoogleUrlScheme(plist, scheme) {
  if (plist.includes(`<string>${scheme}</string>`)) {
    return plist;
  }

  const googleDict = `		<dict>
			<key>CFBundleURLName</key>
			<string>GoogleSignIn</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>${scheme}</string>
			</array>
		</dict>
`;

  const urlTypesKey = "<key>CFBundleURLTypes</key>";
  const keyIndex = plist.indexOf(urlTypesKey);
  if (keyIndex === -1) {
    throw new Error("Info.plist missing CFBundleURLTypes");
  }

  // Find the CFBundleURLTypes <array> ... </array> block and insert before its close.
  const arrayStart = plist.indexOf("<array>", keyIndex);
  if (arrayStart === -1) {
    throw new Error("Info.plist CFBundleURLTypes has no <array>");
  }

  // Match the array that belongs to CFBundleURLTypes (next </array> at indent of one tab after nested dicts).
  // Walk forward to the closing </array> that ends URLTypes: it is followed by </dict> or another <key>.
  let depth = 0;
  let i = arrayStart;
  while (i < plist.length) {
    if (plist.startsWith("<array>", i)) {
      depth += 1;
      i += "<array>".length;
      continue;
    }
    if (plist.startsWith("</array>", i)) {
      depth -= 1;
      if (depth === 0) {
        return plist.slice(0, i) + googleDict + plist.slice(i);
      }
      i += "</array>".length;
      continue;
    }
    i += 1;
  }
  throw new Error("Could not find CFBundleURLTypes closing </array>");
}

if (!iosClientId) {
  console.log(
    "Skipping Google Sign-In Info.plist patch (VITE_GOOGLE_IOS_CLIENT_ID unset).",
  );
} else {
  const reversed = reversedGoogleClientId(iosClientId);
  let plist = readFileSync(plistPath, "utf8");
  plist = upsertPlistString(plist, "GIDClientID", iosClientId);
  if (serverClientId) {
    plist = upsertPlistString(plist, "GIDServerClientID", serverClientId);
  }
  plist = ensureGoogleUrlScheme(plist, reversed);
  writeFileSync(plistPath, plist);
  console.log(
    `Patched Info.plist for Google Sign-In (GIDClientID + URL scheme ${reversed}).`,
  );
}
