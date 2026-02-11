import React, { useState } from "react";
import systemAdminService from "../../../services/systemAdminService";
import "./AuthorityControls.css";

const AuthorityControls = ({ onRotation, sectionId }) => {
  const [rotating, setRotating] = useState(false);
  const [result, setResult] = useState(null);

  const handleRotate = async () => {
    if (
      !window.confirm(
        "Rotating CA keys will invalidate existing trust anchors. Proceed?",
      )
    ) {
      return;
    }
    setRotating(true);
    setResult(null);
    try {
      const response = await systemAdminService.rotateAuthorityKeys();
      setResult(response);
      if (onRotation) {
        onRotation(response);
      }
    } catch (err) {
      const text = err?.response?.data?.message || err.message;
      setResult({ error: text || "Rotation failed" });
    } finally {
      setRotating(false);
    }
  };

  return (
    <div
      id={sectionId}
      className="rounded-3xl border p-6 shadow-xl transition-all duration-300 border-slate-300 bg-white dark:border-slate-900 dark:bg-slate-950/60"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Authority controls
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Trigger classical + PQ CA key rotation when compromise is suspected.
            All downstream certificates will require re-issuance.
          </p>
        </div>
        <button
          className="rounded-2xl border px-5 py-2 text-sm font-semibold shadow-inner transition disabled:cursor-not-allowed disabled:opacity-60 border-rose-500/40 bg-gradient-to-r from-rose-500/70 to-orange-500/70 text-white hover:from-rose-500 hover:to-orange-500 dark:border-rose-500/40 dark:from-rose-500/70 dark:to-orange-500/70"
          onClick={handleRotate}
          disabled={rotating}
        >
          {rotating ? "Rotating…" : "Rotate CA material"}
        </button>
      </div>
      {result && !result.error && (
        <div className="mt-4 space-y-1 text-xs text-slate-600 dark:text-slate-400">
          <p>
            <span className="font-semibold text-slate-900 dark:text-slate-300">RSA keys:</span>{" "}
            {result.classical?.public_key_path}
          </p>
          <p>
            <span className="font-semibold text-slate-900 dark:text-slate-300">PQ keys:</span>{" "}
            {result.post_quantum?.public_key_path}
          </p>
        </div>
      )}
      {result?.error && (
        <p className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300">{result.error}</p>
      )}
    </div>
  );
};

export default AuthorityControls;
