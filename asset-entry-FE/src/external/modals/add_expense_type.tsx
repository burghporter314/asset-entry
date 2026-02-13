import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

interface AddAssetModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (assetId: string) => void;
}

const AddExpenseTypeModal: React.FC<AddAssetModalProps> = ({ show, onHide, onSubmit }) => {
  const [expenseType, setExpenseType] = useState("");

  const handleSubmit = () => {
    onSubmit(expenseType);
    setExpenseType(""); // reset input
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Expense Type</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Expense Type</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter Expense Type"
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
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

export default AddExpenseTypeModal;
