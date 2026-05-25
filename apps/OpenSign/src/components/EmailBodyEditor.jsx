import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import juice from "juice";
import { Trans, useTranslation } from "react-i18next";

const EmailBodyEditor = ({
  value,
  onChange,
  smallscreen = false,
  bodyName,
  isReset = false,
  isTemplateLoaded
}) => {
  const { t } = useTranslation();
  const [inputHtml, setInputHtml] = useState("");
  const [cleanPreview, setCleanPreview] = useState("");

  useEffect(() => {
    initProcessContent();
  }, [isTemplateLoaded]);

  useEffect(() => {
    if (isReset) {
      initProcessContent(value);
    }
  }, [isReset]);

  const sanitizeHtml = (raw) =>
    DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true },
      ADD_ATTR: [
        "target",
        "width", "height", "bgcolor",
        "align", "valign",
        "cellpadding", "cellspacing", "border"
      ],
      ADD_TAGS: ["table", "tr", "td", "th", "thead", "tbody", "tfoot"],
      FORCE_BODY: true,
      WHOLE_DOCUMENT: true
    });

  const inlineStyles = (sanitized) =>
    juice(sanitized, {
      removeStyleTags: false,
      preserveMediaQueries: true,
      preserveFontFaces: true
    });

  const initProcessContent = () => {
    const sanitized = sanitizeHtml(value);
    try {
      const inlined = inlineStyles(sanitized);
      setInputHtml(inlined);
      onChange?.(inlined);
      setCleanPreview(inlined);
    } catch (err) {
      onChange?.(sanitized);
      setInputHtml(sanitized);
      setCleanPreview(sanitized);
    }
  };

  const processContent = (value) => {
    const sanitized = sanitizeHtml(value);
    try {
      const inlined = inlineStyles(sanitized);
      setCleanPreview(inlined);
      onChange?.(inlined);
    } catch (err) {
      setCleanPreview(sanitized);
      onChange?.(sanitized);
    }
  };
  const handleChange = (e) => {
    const value = e.target.value;
    setInputHtml(value);
    processContent(value);
  };

  const screen = smallscreen ? "flex-col" : "flex-col md:flex-row ";
  const template =
    bodyName === "request"
      ? "#sample/requestemail"
      : bodyName === "completion"
        ? "#sample/completionemail"
        : "#";
  return (
    <>
      <p className="text-sm ">
        <Trans i18nKey={"open-email-builder"}>
          {"You can create email template using "}
          <a
            href={`/emailbuilder${template}`}
            target="_blank"
            referrerPolicy="no-referrer"
            className="op-link op-link-primary font-medium"
          >
            email builder
          </a>
          {" platform and copy html code."}
        </Trans>
      </p>
      <div className={`flex ${screen} gap-5`}>
        {/* Editor Pane */}
        <div className="flex flex-1 flex-col mt-2">
          <label>{t("paste-html-here")}:</label>
          <div className="flex-1 mt-1 p-3 text-xs op-textarea op-textarea-bordered min-h-[70vh]">
            <textarea
              className="w-full min-h-[70vh] focus:outline-none"
              value={inputHtml}
              onChange={(e) => handleChange(e)}
              placeholder="<html><body><h1>Hello!</h1></body></html>"
            />
          </div>
        </div>

        {/* Live Preview Pane */}
        <div className="flex flex-1 flex-col mt-2">
          <label>{t("preview")}</label>
          <div className="flex-1 mt-1 bg-white border-[1px] op-textarea border-[#ccc] min-h-[70vh]">
            {cleanPreview && (
              <iframe
                title="Safe Preview"
                srcDoc={cleanPreview}
                // SECURITY: sandbox prevents scripts from running even if they slip through
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                className="w-full min-h-[70vh]"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailBodyEditor;
