Feature: Contatos (Contact)

  Background:
    Given que eu navego para a lista de Contatos

  @smoke
  Scenario: Deve criar um novo contato
    When eu crio um contato com nome único
    Then o título da página deve conter o nome do contato
    And eu excluo o contato criado

  @smoke
  Scenario: Deve exibir contato criado na lista
    When eu crio um contato com nome único
    And eu navego para a lista de Contatos
    Then o contato deve estar visível na lista
    And eu excluo o contato

  @smoke
  Scenario: Deve excluir um contato
    When eu crio um contato com nome único
    And eu navego para a lista de Contatos
    And eu excluo o contato
    Then o contato não deve estar visível na lista

  @regression
  Scenario: Deve exibir diálogo de erro ao salvar sem campos obrigatórios
    When eu tento salvar um contato com campos obrigatórios vazios
    Then o diálogo de erro de validação deve estar visível
    And o erro de validação deve mostrar link para "Last Name"
    And eu fecho o erro de validação e cancelo
