import { useEffect, useRef, useState } from "react";
import Parse from "parse";
import Alert from "../../../primitives/Alert";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const LogoSection = ({ label, savedUrl, previewUrl, onFileChange, onRemove, inputRef }) => {
  const hasLogo = savedUrl || previewUrl;

  return (
    <div className="border border-base-content rounded-box p-4 flex flex-col gap-3">
      <span className="text-sm font-medium text-base-content">{label}</span>

      {hasLogo && (
        <div className="flex items-center justify-center bg-base-200 rounded-box p-3 min-h-[72px]">
          <img
            src={previewUrl || savedUrl}
            alt={label}
            className="max-h-16 object-contain"
          />
        </div>
      )}

      <div className="flex flex-row gap-2 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        <button
          type="button"
          className="op-btn op-btn-ghost op-btn-sm"
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </button>

        {hasLogo && (
          <button
            type="button"
            className="op-btn op-btn-ghost op-btn-sm text-error"
            onClick={onRemove}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

const OrgBrandingTab = () => {
  const [saved, setSaved] = useState({ light: null, dark: null });
  const [pending, setPending] = useState({ light: null, dark: null });
  const [previews, setPreviews] = useState({ light: null, dark: null });
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ type: "", msg: "" });

  const lightInputRef = useRef(null);
  const darkInputRef = useRef(null);

  useEffect(() => {
    const tenantId = localStorage.getItem("TenantId");
    if (!tenantId) return;

    Parse.Cloud.run("getorgbranding", { tenantId })
      .then((res) => {
        if (res) {
          setSaved({
            light: res.logoLight || null,
            dark: res.logoDark || null,
          });
        }
      })
      .catch((err) => {
        console.error("getorgbranding error:", err);
      });
  }, []);

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: "", msg: "" }), 2000);
  };

  const handleFileChange = (slot) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPending((prev) => ({ ...prev, [slot]: file }));
    setPreviews((prev) => ({ ...prev, [slot]: objectUrl }));
    // reset input so the same file can be re-selected after a remove
    e.target.value = "";
  };

  const handleRemove = (slot) => () => {
    if (previews[slot]) {
      URL.revokeObjectURL(previews[slot]);
    }
    setPending((prev) => ({ ...prev, [slot]: "remove" }));
    setPreviews((prev) => ({ ...prev, [slot]: null }));
    setSaved((prev) => ({ ...prev, [slot]: null }));
  };

  const handleSave = async () => {
    const tenantId = localStorage.getItem("TenantId");
    if (!tenantId) return;

    setIsSaving(true);
    try {
      const changedFields = {};

      for (const [slot, key] of [["light", "logoLight"], ["dark", "logoDark"]]) {
        if (pending[slot] === "remove") {
          changedFields[key] = null;
        } else if (pending[slot] instanceof File) {
          const base64 = await fileToBase64(pending[slot]);
          changedFields[key] = {
            base64,
            contentType: pending[slot].type,
            name: pending[slot].name,
          };
        }
        // no change → omit entirely
      }

      const res = await Parse.Cloud.run("saveorgbranding", {
        tenantId,
        ...changedFields,
      });

      // update saved URLs from response
      setSaved({
        light: res?.logoLight || null,
        dark: res?.logoDark || null,
      });
      // clear pending state
      setPending({ light: null, dark: null });
      // revoke any leftover object URLs
      if (previews.light) URL.revokeObjectURL(previews.light);
      if (previews.dark) URL.revokeObjectURL(previews.dark);
      setPreviews({ light: null, dark: null });

      showAlert("success", "Branding saved successfully.");
    } catch (err) {
      console.error("saveorgbranding error:", err);
      showAlert("danger", err.message || "Failed to save branding.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="panel-branding">
      {alert.msg && <Alert type={alert.type}>{alert.msg}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LogoSection
          label="Light mode logo"
          savedUrl={saved.light}
          previewUrl={previews.light}
          onFileChange={handleFileChange("light")}
          onRemove={handleRemove("light")}
          inputRef={lightInputRef}
        />
        <LogoSection
          label="Dark mode logo"
          savedUrl={saved.dark}
          previewUrl={previews.dark}
          onFileChange={handleFileChange("dark")}
          onRemove={handleRemove("dark")}
          inputRef={darkInputRef}
        />
      </div>

      <div className="flex justify-start mt-6">
        <button
          type="button"
          className="op-btn op-btn-primary w-[110px]"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

export default OrgBrandingTab;
