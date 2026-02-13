import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

interface AddAssetModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (assetId: string) => void;
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({ show, onHide, onSubmit }) => {
  const [assetId, setAssetId] = useState("");

  const handleSubmit = () => {
    onSubmit(assetId);
    setAssetId(""); // reset input
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Asset ID</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Asset ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter asset ID"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Add
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddAssetModal;
