import { faFileDownload, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Toolbar.css";

type Props = {
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
};

const Toolbar = ({ data, setData }: Props) => {
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();

    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = e => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setData(data as DiscoveryData);
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };
      fileReader.onerror = (error) => {
        console.error("Error reading file:", error);
      };
    }
  };

  const handleExport = () => {
    if (!data) return;

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.title.replace(/\s+/g, '_')}_export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="toolbar">
      <div>
        <label htmlFor="file-input">
          <FontAwesomeIcon icon={faUpload} size='1x' />
        </label>
        <input
          id="file-input"
          type="file"
          accept=".json"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>
      <div>
        <button onClick={handleExport} style={{ border: 'none', background: 'none' }}>
          <FontAwesomeIcon icon={faFileDownload} size='lg' />
        </button>
      </div>
    </div>);
}

export default Toolbar;