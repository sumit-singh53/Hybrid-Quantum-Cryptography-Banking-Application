import React, { useState } from "react";
import { validateCertificateFile } from "../../utils/validators";

const CertificateUpload = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const validation = validateCertificateFile(selectedFile);

    if (!validation.valid) {
      setError(validation.message);
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a certificate file");
      return;
    }
    onUpload(file);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col w-full max-w-md gap-4 p-4 mx-auto bg-white rounded-lg shadow"
    >
      <input
        type="file"
        accept=".pem,.crt"
        onChange={handleFileChange}
        className="block w-full mt-2 mb-2 text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {error && <div className="mb-2 text-sm text-red-600">{error}</div>}

      <button
        type="submit"
        className="w-full px-4 py-2 font-semibold text-white transition bg-blue-800 rounded-lg shadow hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Login with Certificate
      </button>
    </form>
  );
};

export default CertificateUpload;
