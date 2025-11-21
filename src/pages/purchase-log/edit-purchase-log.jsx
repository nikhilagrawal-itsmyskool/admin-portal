import React from 'react';
import PurchaseLogForm from '../../components/forms/purchase-log-form';

// The 'logToEdit' prop contains the data of the item being edited
const EditPurchaseLog = ({ logToEdit, onEdit, onCancel }) => {
  return (
    <PurchaseLogForm
      initialData={logToEdit}
      onSubmit={onEdit}
      onCancel={onCancel}
      formTitle={`Edit Purchase Log ID: ${logToEdit.id}`}
    />
  );
};

export default EditPurchaseLog;