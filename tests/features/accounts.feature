Feature: Contas (Account)

  Background:
    Given que eu navego para a lista de Contas

  @smoke
  Scenario: Deve criar uma nova conta
    When eu crio uma conta com nome único
    Then o título da página deve conter o nome da conta
    And eu excluo a conta criada

  @smoke
  Scenario: Deve exibir conta criada na lista
    When eu crio uma conta com nome único
    And eu navego para a lista de Contas
    Then a conta deve estar visível na lista
    And eu excluo a conta

  @smoke
  Scenario: Deve excluir uma conta
    When eu crio uma conta com nome único
    And eu navego para a lista de Contas
    And eu excluo a conta
    Then a conta não deve estar visível na lista

  @regression
  Scenario: Deve preencher todos os campos de uma conta e salvar com sucesso
    When eu abro o modal de nova conta
    And eu preencho todos os campos da conta
    And eu salvo o registro
    And eu aguardo a página do registro
    Then o título da página deve ser igual ao nome da conta
    And eu excluo a conta criada

  @regression
  Scenario: Deve criar uma conta com informações parciais e salvar com sucesso
    When eu crio uma conta com informações parciais
    Then o título da página deve conter o nome da conta
    And eu excluo a conta criada

  @regression
  Scenario: Deve exibir campos vazios e erro inline ao limpar campos obrigatórios
    When eu preencho e limpo todos os campos de uma nova conta
    Then todos os campos da conta devem estar vazios
    And o erro inline do campo Account Name deve estar visível

  @regression
  Scenario: Deve exibir diálogo de erro de validação ao salvar sem campos obrigatórios
    When eu tenta salvar uma conta com campos obrigatórios vazios
    Then o diálogo de erro de validação deve estar visível
    And o erro de validação deve mostrar link para "Account Name"
    And eu fecho o erro de validação e cancelo
